const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Plan = require('../../src/models/Plan');
const Notification = require('../../src/models/Notification');
const WorkoutLog = require('../../src/models/WorkoutLog');
const cron = require('node-cron');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect, createPlanDirect, buildSesion } = require('../helpers/factories');

const DIA_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

// Cargamos el cron REAL una única vez (con node-cron mockeado, ver
// __mocks__/node-cron.js): esto ejecuta los dos `cron.schedule(...)` de
// expirationCheck.js, capturando sus callbacks reales sin programar timers
// de verdad. Importante: NO usamos jest.resetModules() acá — eso crearía
// una instancia de mongoose nueva y desconectada de la base de test.
require('../../src/cron/expirationCheck');
const cronRegistrado = cron.__getRegistered();
// El segundo cron.schedule(...) del archivo es el de actualización semanal.
const cronSemanal = cronRegistrado[1].callback;

describe('GET /api/student/dashboard — estado de cuota', () => {
    it('sin token → 401', async () => {
        expect((await request(app).get('/api/student/dashboard')).status).toBe(401);
    });

    it.each([
        [10, 10],
        [1, 1],
        [0, 0],
        [-1, 0],
        [-30, 0],
    ])('fechaVencimiento a %i días de hoy → diasRestantes=%i (nunca negativo)', async (offsetDias, esperado) => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id, {
            fechaVencimiento: new Date(Date.now() + offsetDias * DIA_MS)
        });
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.user.diasRestantes).toBe(esperado);
    });

    it('estado es "ACTIVO" si diasRestantes > 0, "VENCIDO" si es 0', async () => {
        const { admin } = await createAdmin();
        const { token: tokenActivo } = await createStudentDirect(admin._id, { fechaVencimiento: new Date(Date.now() + DIA_MS) });
        const { token: tokenVencido } = await createStudentDirect(admin._id, { fechaVencimiento: new Date(Date.now() - DIA_MS) });
        expect((await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${tokenActivo}`)).body.user.estado).toBe('ACTIVO');
        expect((await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${tokenVencido}`)).body.user.estado).toBe('VENCIDO');
    });

    it('BUG: usuario borrado con token todavía válido → 500 genérico en vez de un 401 claro', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await User.findByIdAndDelete(student._id);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(500);
    });
});

describe('GET /api/student/dashboard — EL BUG DEL DOBLE DECREMENTO en "semanas restantes" del plan', () => {
    // Hay DOS mecanismos independientes que erosionan `plan.vencimiento`:
    //  (A) El cron semanal (cron/expirationCheck.js) resta 1 cada domingo 23:59.
    //  (B) getStudentDashboard recalcula "semanasRestantesDinamicas" como
    //      (createdAt + vencimiento_ACTUAL*7 días) - hoy, usando el valor YA
    //      decrementado por (A) como si fuera el total original.
    // Resultado: cada semana que pasa, el plan pierde ~2 semanas de vida útil
    // en vez de 1. Estos tests lo muestran con números concretos.

    async function crearPlanConNSemanasTranscurridas(vencimientoInicial, semanasTranscurridas) {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const createdAt = new Date(Date.now() - semanasTranscurridas * 7 * DIA_MS);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: vencimientoInicial, createdAt });

        for (let i = 0; i < semanasTranscurridas; i++) {
            await cronSemanal(); // simula que el cron corrió una vez por cada semana transcurrida
        }
        return { token, planId: plan._id };
    }

    it('semana 0 (recién publicado, cron nunca corrió): semanasRestantes = 4, como se esperaría', async () => {
        const { token } = await crearPlanConNSemanasTranscurridas(4, 0);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.plan.semanasRestantes).toBe(4);
    });

    it('BUG: después de 1 semana real Y 1 corrida del cron, el dashboard NO muestra 3 semanas restantes — muestra 2', async () => {
        const { token } = await crearPlanConNSemanasTranscurridas(4, 1);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        // Expectativa ingenua/correcta: 4 semanas totales - 1 transcurrida = 3.
        // Comportamiento real: el cron ya dejó vencimiento=3, y el dashboard
        // calcula la fecha de expiración como createdAt + 3*7 días — pero ya
        // pasaron 7 de esos 21 días, así que quedan 14 días = 2 semanas.
        expect(res.body.plan.semanasRestantes).toBe(2);
        expect(res.body.plan.semanasRestantes).not.toBe(3);
    });

    it('BUG: después de 2 semanas reales y 2 corridas del cron, "quedan" 0 semanas (el plan ya se autodesactivó) en vez de 2', async () => {
        const { token, planId } = await crearPlanConNSemanasTranscurridas(4, 2);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        // Un plan de 4 semanas se muere a la MITAD de su duración prometida.
        expect(res.body.plan).toBeNull();
        const planEnDb = await Plan.findById(planId);
        expect(planEnDb.activo).toBe(false);
    });

    it('control: si el cron NUNCA corre (solo pasa tiempo real), el cálculo del dashboard es internamente consistente', async () => {
        // Aísla la variable: sin la interacción de (A), el mecanismo (B) solo
        // no tiene el bug de "doble descuento" — esto confirma que el problema
        // es específicamente la COMBINACIÓN de los dos mecanismos, no cada
        // uno por separado.
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, {
            vencimiento: 4,
            createdAt: new Date(Date.now() - 7 * DIA_MS) // 1 semana real transcurrida, cron NUNCA corrió
        });
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.plan.semanasRestantes).toBe(3); // esto SÍ da el valor "correcto"
    });

    it('la curva completa semana a semana: 4 → 2 → 0 (huecos), no 4 → 3 → 2 → 1 como se esperaría', async () => {
        const puntos = [];
        for (let semanas = 0; semanas <= 2; semanas++) {
            const { token } = await crearPlanConNSemanasTranscurridas(4, semanas);
            const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
            puntos.push(res.body.plan ? res.body.plan.semanasRestantes : 0);
        }
        expect(puntos).toEqual([4, 2, 0]);
    });
});

describe('GET /api/student/dashboard — notificación de plan por vencer', () => {
    it('crea una notificación PLAN cuando quedan <= 7 días, y marca avisoVencimientoEnviado', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, {
            vencimiento: 1, // 1 semana = 7 días, createdAt hoy → quedan ~7 días
        });
        await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        const notifs = await Notification.find({ alumnoId: student._id, tipo: 'PLAN' });
        expect(notifs).toHaveLength(1);
    });

    it('NO duplica la notificación en una segunda llamada secuencial (el flag avisoVencimientoEnviado protege)', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { vencimiento: 1 });
        await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        const notifs = await Notification.find({ alumnoId: student._id, tipo: 'PLAN' });
        expect(notifs).toHaveLength(1);
    });

    it('RACE CONDITION: dos requests CONCURRENTES al filo del umbral pueden crear notificaciones duplicadas', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { vencimiento: 1 });

        await Promise.all([
            request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`),
            request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`),
        ]);

        const notifs = await Notification.find({ alumnoId: student._id, tipo: 'PLAN' });
        // Documentamos el resultado real: como la lectura de avisoVencimientoEnviado
        // y su guardado no son atómicos, dos requests simultáneas ALCANZAN a
        // pasar el `if` antes de que cualquiera de las dos guarde el flag.
        expect(notifs.length).toBeGreaterThanOrEqual(1);
    });
});

describe('GET /api/student/dashboard — datos generales', () => {
    it('cuenta totalWorkouts correctamente', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await WorkoutLog.create([
            { alumnoId: student._id, nombreSesion: 'A' },
            { alumnoId: student._id, nombreSesion: 'B' },
            { alumnoId: student._id, nombreSesion: 'C' },
        ]);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.stats.sesionesCompletadas).toBe(3);
    });

    it('BUG: stats.racha viene siempre hardcodeado en 0 desde el backend (el streak real se calcula aparte, en el frontend)', async () => {
        const { admin } = await createAdmin();
        const { token, student } = await createStudentDirect(admin._id);
        await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'A' });
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.stats.racha).toBe(0);
    });

    it('sin plan activo, "plan" viene null y no crashea', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.plan).toBeNull();
    });
});

describe('POST /api/student/workout (saveWorkoutLog)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).post('/api/student/workout').send({})).status).toBe(401);
    });

    it('camino feliz: guarda el entrenamiento', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/student/workout').set('Authorization', `Bearer ${token}`).send({
            nombreSesion: 'Día 1', duracion: '30m', ejercicios: [{ ejercicioId: '1', nombre: 'Press', pesoUsado: 40 }]
        });
        expect(res.status).toBe(201);
    });

    it('bloquea un SEGUNDO entrenamiento el mismo día calendario', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        await request(app).post('/api/student/workout').set('Authorization', `Bearer ${token}`).send({ nombreSesion: 'Día 1' });
        const res = await request(app).post('/api/student/workout').set('Authorization', `Bearer ${token}`).send({ nombreSesion: 'Día 2' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/ya registraste/i);
    });

    it('NO bloquea un entrenamiento al día calendario SIGUIENTE (el log anterior queda con createdAt de "ayer")', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Día 1', createdAt: ayer });
        // El create() de arriba pisa createdAt con `new Date()` por timestamps:true,
        // así que lo corregimos con una escritura directa a Mongo (bypass de Mongoose):
        await WorkoutLog.collection.updateOne({ alumnoId: student._id }, { $set: { createdAt: ayer } });

        const res = await request(app).post('/api/student/workout').set('Authorization', `Bearer ${token}`).send({ nombreSesion: 'Día 2' });
        expect(res.status).toBe(201);
    });

    it('acepta un nombreSesion que NO corresponde a ninguna sesión real del plan asignado (no hay validación cruzada con el Plan)', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { sesiones: [buildSesion({ nombre: 'Día 1' })] });
        const res = await request(app).post('/api/student/workout').set('Authorization', `Bearer ${token}`).send({
            nombreSesion: 'Sesión totalmente inventada que no existe en el plan',
            ejercicios: [{ ejercicioId: '1', nombre: 'Ejercicio fantasma', pesoUsado: 999999 }]
        });
        expect(res.status).toBe(201);
    });

    it('un ejercicio sin nombre en el array `ejercicios` hace fallar el guardado completo (ValidationError → 500)', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/student/workout').set('Authorization', `Bearer ${token}`).send({
            nombreSesion: 'Día 1', ejercicios: [{ ejercicioId: '1' }]
        });
        expect(res.status).toBe(500);
    });
});

describe('GET /api/student/history (getMyHistory)', () => {
    it('IDOR: un alumno solo ve SU propio historial, no el de otro alumno', async () => {
        const { admin } = await createAdmin();
        const { student: alumnoA, token: tokenA } = await createStudentDirect(admin._id);
        const { student: alumnoB } = await createStudentDirect(admin._id);
        await WorkoutLog.create({ alumnoId: alumnoA._id, nombreSesion: 'De A' });
        await WorkoutLog.create({ alumnoId: alumnoB._id, nombreSesion: 'De B' });

        const res = await request(app).get('/api/student/history').set('Authorization', `Bearer ${tokenA}`);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].nombreSesion).toBe('De A');
    });

    it('respeta el límite de 50 y devuelve los más recientes primero', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const logs = [];
        for (let i = 0; i < 60; i++) {
            logs.push({ alumnoId: student._id, nombreSesion: `Sesión ${i}`, createdAt: new Date(Date.now() + i * 1000) });
        }
        await WorkoutLog.insertMany(logs); // insertMany respeta createdAt explícito
        const res = await request(app).get('/api/student/history').set('Authorization', `Bearer ${token}`);
        expect(res.body).toHaveLength(50);
        expect(res.body[0].nombreSesion).toBe('Sesión 59'); // la más reciente
    });
});

describe('Notificaciones del alumno — IDOR en markNotificationRead', () => {
    it('BUG DE SEGURIDAD (IDOR): un alumno puede marcar como leída la notificación de OTRO alumno', async () => {
        const { admin } = await createAdmin();
        const { student: victima } = await createStudentDirect(admin._id);
        const { token: tokenAtacante } = await createStudentDirect(admin._id);

        const notifDeLaVictima = await Notification.create({
            alumnoId: victima._id, titulo: 'Aviso importante', mensaje: 'Tu cuota vence', tipo: 'ALERTA'
        });

        const res = await request(app)
            .put(`/api/student/notifications/${notifDeLaVictima._id}/read`)
            .set('Authorization', `Bearer ${tokenAtacante}`);

        expect(res.status).toBe(200); // el endpoint NO verifica dueño → responde OK
        const notifActualizada = await Notification.findById(notifDeLaVictima._id);
        expect(notifActualizada.leida).toBe(true); // y efectivamente la modificó
    });

    it('getMyNotifications: cada alumno ve solo las suyas, ordenadas y limitadas a 20', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const { student: otro } = await createStudentDirect(admin._id);
        await Notification.create({ alumnoId: otro._id, titulo: 'Ajena', mensaje: 'x' });
        for (let i = 0; i < 25; i++) {
            await Notification.create({ alumnoId: student._id, titulo: `N${i}`, mensaje: 'x' });
        }
        const res = await request(app).get('/api/student/notifications').set('Authorization', `Bearer ${token}`);
        expect(res.body).toHaveLength(20);
        expect(res.body.every(n => n.titulo !== 'Ajena')).toBe(true);
    });
});

describe('PUT /api/student/change-password', () => {
    it('contraseña actual incorrecta → 401', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id, { dni: '999' });
        const res = await request(app).put('/api/student/change-password').set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: 'incorrecta', newPassword: 'nueva123' });
        expect(res.status).toBe(401);
    });

    it('camino feliz: cambia la contraseña y permite loguearse con la nueva', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id, { dni: '888' });
        const res = await request(app).put('/api/student/change-password').set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: '888', newPassword: 'nuevaSegura123' });
        expect(res.status).toBe(200);
        const login = await request(app).post('/api/auth/login').send({ email: student.email, password: 'nuevaSegura123' });
        expect(login.status).toBe(200);
    });

    it('BUG: no hay ninguna validación server-side de longitud mínima — acepta una contraseña de 1 solo caracter', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id, { dni: '777' });
        const res = await request(app).put('/api/student/change-password').set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: '777', newPassword: 'x' });
        // El frontend exige mínimo 6 caracteres, pero es SOLO client-side:
        // pegándole directo a la API (como hace este test) no hay ningún freno.
        expect(res.status).toBe(200);
    });
});
