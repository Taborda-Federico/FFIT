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

    it('ARREGLADO: usuario borrado con token todavía válido → 401 claro (antes daba 500 genérico)', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        await User.findByIdAndDelete(student._id);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });
});

describe('GET /api/student/dashboard — ARREGLADO: ya no hay doble decremento en "semanas restantes"', () => {
    // Antes había DOS mecanismos independientes erosionando `plan.vencimiento`:
    // el cron semanal (resta 1 cada domingo) y este mismo endpoint (que
    // recalculaba una fecha de expiración propia usando el vencimiento YA
    // decrementado por el cron como si fuera el total original). Ahora el
    // dashboard solo LEE plan.vencimiento — el cron es la única fuente de
    // verdad. Ver docs/CAMBIOS.md #5 para el detalle completo.

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

    it('semana 0 (recién publicado, cron nunca corrió): semanasRestantes = 4', async () => {
        const { token } = await crearPlanConNSemanasTranscurridas(4, 0);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.plan.semanasRestantes).toBe(4);
    });

    it('después de 1 semana real y 1 corrida del cron, semanasRestantes = 3 (no 2)', async () => {
        const { token } = await crearPlanConNSemanasTranscurridas(4, 1);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.plan.semanasRestantes).toBe(3);
    });

    it('después de 2 semanas reales y 2 corridas del cron, semanasRestantes = 2 (el plan sigue activo, no se autodesactivó a mitad de camino)', async () => {
        const { token, planId } = await crearPlanConNSemanasTranscurridas(4, 2);
        const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        expect(res.body.plan).not.toBeNull();
        expect(res.body.plan.semanasRestantes).toBe(2);
        expect((await Plan.findById(planId)).activo).toBe(true);
    });

    it('la curva completa semana a semana ahora es lineal: 4 → 3 → 2 → 1 → 0 (desactivado)', async () => {
        const puntos = [];
        for (let semanas = 0; semanas <= 4; semanas++) {
            const { token } = await crearPlanConNSemanasTranscurridas(4, semanas);
            const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
            puntos.push(res.body.plan ? res.body.plan.semanasRestantes : 0);
        }
        expect(puntos).toEqual([4, 3, 2, 1, 0]);
    });

    it('un GET al dashboard ya NO modifica la base de datos — se puede llamar muchas veces seguidas sin efecto alguno', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: 1 });
        const updatedAtAntes = (await Plan.findById(plan._id)).updatedAt;

        await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`);
        await Promise.all([
            request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`),
            request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${token}`),
        ]);

        const planDespues = await Plan.findById(plan._id);
        expect(planDespues.updatedAt.getTime()).toBe(updatedAtAntes.getTime());
        expect(await Notification.countDocuments({ alumnoId: student._id })).toBe(0);
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

describe('Notificaciones del alumno — markNotificationRead', () => {
    it('ARREGLADO (era IDOR): un alumno YA NO puede marcar como leída la notificación de otro alumno', async () => {
        const { admin } = await createAdmin();
        const { student: victima } = await createStudentDirect(admin._id);
        const { token: tokenAtacante } = await createStudentDirect(admin._id);

        const notifDeLaVictima = await Notification.create({
            alumnoId: victima._id, titulo: 'Aviso importante', mensaje: 'Tu cuota vence', tipo: 'ALERTA'
        });

        const res = await request(app)
            .put(`/api/student/notifications/${notifDeLaVictima._id}/read`)
            .set('Authorization', `Bearer ${tokenAtacante}`);

        expect(res.status).toBe(404);
        const notifSinTocar = await Notification.findById(notifDeLaVictima._id);
        expect(notifSinTocar.leida).toBe(false); // sigue intacta, no se pudo tocar
    });

    it('un alumno SÍ puede marcar como leída su PROPIA notificación', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const propia = await Notification.create({
            alumnoId: student._id, titulo: 'Para vos', mensaje: 'x', tipo: 'INFO'
        });

        const res = await request(app)
            .put(`/api/student/notifications/${propia._id}/read`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect((await Notification.findById(propia._id)).leida).toBe(true);
    });

    it('marcar una notificación que no existe (id válido pero inexistente) → 404', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        const res = await request(app)
            .put('/api/student/notifications/507f1f77bcf86cd799439011/read')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    it('sin token → 401', async () => {
        const res = await request(app).put('/api/student/notifications/507f1f77bcf86cd799439011/read');
        expect(res.status).toBe(401);
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

    it('ARREGLADO: una contraseña nueva de menos de 6 caracteres se rechaza también del lado del servidor', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id, { dni: '777' });
        const res = await request(app).put('/api/student/change-password').set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: '777', newPassword: 'x' });
        expect(res.status).toBe(400);
    });

    it('una contraseña nueva de exactamente 6 caracteres sí se acepta (el límite es "al menos 6")', async () => {
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id, { dni: '778' });
        const res = await request(app).put('/api/student/change-password').set('Authorization', `Bearer ${token}`)
            .send({ currentPassword: '778', newPassword: '123456' });
        expect(res.status).toBe(200);
    });
});
