const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Plan = require('../../src/models/Plan');
const WorkoutLog = require('../../src/models/WorkoutLog');
const nodemailer = require('nodemailer');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect, createPlanDirect } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); nodemailer.__resetMailMock(); });
afterAll(async () => { await closeDatabase(); });

describe('POST /api/users (createStudent)', () => {
    let token;
    beforeEach(async () => { ({ token } = await createAdmin()); });

    const payloadBase = () => ({
        nombre: 'Alumno Nuevo', dni: '30111222', email: 'alumno@x.com',
        telefono: '1122334455', peso: '80', altura: '180',
        domicilio: 'Av. Siempreviva 742', montoPago: '15000',
        fechaInicio: '2026-01-01'
    });

    it('sin token → 401', async () => {
        const res = await request(app).post('/api/users').send(payloadBase());
        expect(res.status).toBe(401);
    });

    it('camino feliz → 201 y el alumno queda en la base con role=user, estado=Al día', async () => {
        const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payloadBase());
        expect(res.status).toBe(201);
        const guardado = await User.findOne({ email: 'alumno@x.com' });
        expect(guardado.role).toBe('user');
        expect(guardado.estado).toBe('Al día');
    });

    it('la contraseña inicial es el DNI, y queda hasheada (no en texto plano)', async () => {
        await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payloadBase());
        const guardado = await User.findOne({ email: 'alumno@x.com' });
        expect(guardado.password).not.toBe('30111222');
        await expect(guardado.matchPassword('30111222')).resolves.toBe(true);
        // Y con esa contraseña débil (su propio DNI) puede loguearse:
        const login = await request(app).post('/api/auth/login').send({ email: 'alumno@x.com', password: '30111222' });
        expect(login.status).toBe(200);
    });

    it('BUG: "domicilio" no se guarda — el campo no existe en el schema de User', async () => {
        await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payloadBase());
        const guardado = await User.collection.findOne({ email: 'alumno@x.com' });
        expect(guardado.domicilio).toBeUndefined();
    });

    it('BUG: "montoPago" (obligatorio en el form) nunca llega a persistirse en ningún lado', async () => {
        await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payloadBase());
        const guardado = await User.collection.findOne({ email: 'alumno@x.com' });
        expect(guardado.montoPago).toBeUndefined();
        // Y no hay ninguna otra colección (Payment/Transaction) donde haya
        // quedado registrado: no existe tal modelo en todo el backend.
        const colecciones = await require('mongoose').connection.db.listCollections().toArray();
        expect(colecciones.map(c => c.name)).not.toEqual(expect.arrayContaining(['payments', 'transactions', 'pagos']));
    });

    it('BUG: "fechaInicio" elegida en el form se ignora — fechaVencimiento siempre se calcula desde HOY, no desde la fecha elegida', async () => {
        // Se pide una fecha de inicio en el pasado (hace 6 meses) — si se
        // respetara, la cuota ya debería estar vencida (inicio + 1 mes < hoy).
        const haceSeisMeses = new Date();
        haceSeisMeses.setMonth(haceSeisMeses.getMonth() - 6);
        const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
            .send({ ...payloadBase(), fechaInicio: haceSeisMeses.toISOString().split('T')[0] });
        expect(res.status).toBe(201);
        const guardado = await User.findOne({ email: 'alumno@x.com' });
        const hoy = new Date();
        const diffDias = (guardado.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24);
        // Si respetara fechaInicio, diffDias sería fuertemente negativo (vencido).
        // En cambio, siempre da ~1 mes a futuro desde HOY.
        expect(diffDias).toBeGreaterThan(20);
    });

    it.each([
        ['nombre', { nombre: undefined }],
        ['dni', { dni: undefined }],
        ['email', { email: undefined }],
    ])('sin %s → no crea un alumno con datos incompletos silenciosamente (falla o el campo falta)', async (campo, override) => {
        const payload = { ...payloadBase(), ...override };
        const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payload);
        if (res.status === 201) {
            const guardado = await User.findById(res.body._id);
            expect(guardado[campo]).toBeFalsy();
        } else {
            // Puede dar 500 (ValidationError, ej. falta nombre) o 400: cuando
            // el campo ausente es email o dni, `{ $or: [{ email: undefined }, ...] }`
            // termina siendo una cláusula sin filtro real, que matchea CUALQUIER
            // usuario ya existente en la colección (como el admin del beforeEach)
            // y el endpoint responde "ya existe" en vez de una validación clara.
            expect([400, 500]).toContain(res.status);
        }
    });

    it('email o DNI duplicado (secuencial, no concurrente) → 400, mensaje claro', async () => {
        await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payloadBase());
        const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
            .send({ ...payloadBase(), nombre: 'Otro' });
        expect(res.status).toBe(400);
    });

    it('RACE CONDITION: dos altas concurrentes con el mismo DNI (distinto email) — ambas pueden llegar a crearse (no hay índice único en dni)', async () => {
        const [r1, r2] = await Promise.all([
            request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
                .send({ ...payloadBase(), email: 'carrera1@x.com' }),
            request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
                .send({ ...payloadBase(), email: 'carrera2@x.com' }),
        ]);
        const exitosos = [r1, r2].filter(r => r.status === 201).length;
        const conMismoDni = await User.countDocuments({ dni: payloadBase().dni });
        // Documentamos el resultado real: como `dni` no tiene índice único
        // (solo se chequea con un findOne previo, sujeto a TOCTOU), es posible
        // terminar con dos cuentas activas compartiendo el mismo DNI/contraseña.
        expect(conMismoDni).toBe(exitosos);
        expect(exitosos).toBeGreaterThanOrEqual(1);
    });

    it('RACE CONDITION: dos altas concurrentes con el MISMO email — el índice único de Mongo garantiza que solo una gane', async () => {
        const [r1, r2] = await Promise.all([
            request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
                .send({ ...payloadBase(), dni: '111', email: 'carrera-email@x.com' }),
            request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
                .send({ ...payloadBase(), dni: '222', email: 'carrera-email@x.com' }),
        ]);
        const exitosos = [r1, r2].filter(r => r.status === 201).length;
        expect(exitosos).toBe(1);
        const total = await User.countDocuments({ email: 'carrera-email@x.com' });
        expect(total).toBe(1);
    });

    it('si falla el envío del email de bienvenida, el alumno se crea igual (201)', async () => {
        nodemailer.__setShouldFailAll(true);
        const res = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send(payloadBase());
        expect(res.status).toBe(201);
        expect(await User.countDocuments({ email: 'alumno@x.com' })).toBe(1);
    });
});

describe('GET /api/users (getStudents)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).get('/api/users')).status).toBe(401);
    });

    it('IDOR: cada admin ve solo a SUS alumnos, no los de otro admin', async () => {
        const { token: tokenA, admin: adminA } = await createAdmin();
        const { token: tokenB, admin: adminB } = await createAdmin();
        await createStudentDirect(adminA._id, { nombre: 'De Admin A' });
        await createStudentDirect(adminB._id, { nombre: 'De Admin B' });

        const resA = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenA}`);
        expect(resA.body).toHaveLength(1);
        expect(resA.body[0].nombre).toBe('De Admin A');

        const resB = await request(app).get('/api/users').set('Authorization', `Bearer ${tokenB}`);
        expect(resB.body).toHaveLength(1);
        expect(resB.body[0].nombre).toBe('De Admin B');
    });

    it('no incluye el campo password en la respuesta', async () => {
        const { token, admin } = await createAdmin();
        await createStudentDirect(admin._id);
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
        expect(res.body[0].password).toBeUndefined();
    });

    it('incluye planActivoNombre: el título del plan más reciente, o "Sin rutina asignada"', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id, { nombre: 'Sin plan' });
        const { student: student2 } = await createStudentDirect(admin._id, { nombre: 'Con plan' });
        await createPlanDirect(admin._id, student2._id, { titulo: 'Fuerza Nivel 1' });

        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
        const sinPlan = res.body.find(a => a.nombre === 'Sin plan');
        const conPlan = res.body.find(a => a.nombre === 'Con plan');
        expect(sinPlan.planActivoNombre).toBe('Sin rutina asignada');
        expect(conPlan.planActivoNombre).toBe('Fuerza Nivel 1');
    });

    it('devuelve los alumnos ordenados del más nuevo al más viejo', async () => {
        const { token, admin } = await createAdmin();
        await createStudentDirect(admin._id, { nombre: 'Primero', email: 'p@x.com', dni: '1' });
        await new Promise(r => setTimeout(r, 5));
        await createStudentDirect(admin._id, { nombre: 'Segundo', email: 's@x.com', dni: '2' });
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
        expect(res.body[0].nombre).toBe('Segundo');
        expect(res.body[1].nombre).toBe('Primero');
    });
});

describe('PUT /api/users/:id/renew (renewSubscription)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).put('/api/users/507f1f77bcf86cd799439011/renew')).status).toBe(401);
    });

    it('IDOR: un admin no puede renovar la membresía de un alumno de OTRO admin', async () => {
        const { admin: adminA } = await createAdmin();
        const { token: tokenB } = await createAdmin();
        const { student } = await createStudentDirect(adminA._id);
        const res = await request(app).put(`/api/users/${student._id}/renew`).set('Authorization', `Bearer ${tokenB}`);
        expect(res.status).toBe(404);
    });

    it('id inexistente → 404', async () => {
        const { token } = await createAdmin();
        const res = await request(app).put('/api/users/507f1f77bcf86cd799439011/renew').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    it('si la cuota ya venció, la renovación cuenta 30 días desde HOY', async () => {
        const { token, admin } = await createAdmin();
        const vencidaHaceUnaSemana = new Date();
        vencidaHaceUnaSemana.setDate(vencidaHaceUnaSemana.getDate() - 7);
        const { student } = await createStudentDirect(admin._id, { fechaVencimiento: vencidaHaceUnaSemana, estado: 'Pendiente' });

        await request(app).put(`/api/users/${student._id}/renew`).set('Authorization', `Bearer ${token}`);
        const actualizado = await User.findById(student._id);
        const diasRestantes = Math.round((actualizado.fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24));
        expect(diasRestantes).toBeGreaterThanOrEqual(29);
        expect(diasRestantes).toBeLessThanOrEqual(30);
        expect(actualizado.estado).toBe('Al día');
    });

    it('si la cuota todavía está vigente, la renovación SUMA 30 días a partir del vencimiento actual (no desde hoy)', async () => {
        const { token, admin } = await createAdmin();
        const vigentePor10DiasMas = new Date();
        vigentePor10DiasMas.setDate(vigentePor10DiasMas.getDate() + 10);
        const { student } = await createStudentDirect(admin._id, { fechaVencimiento: vigentePor10DiasMas });

        await request(app).put(`/api/users/${student._id}/renew`).set('Authorization', `Bearer ${token}`);
        const actualizado = await User.findById(student._id);
        const diasRestantes = Math.round((actualizado.fechaVencimiento - new Date()) / (1000 * 60 * 60 * 24));
        // 10 días vigentes + 30 nuevos = ~40, NO 30 (no "desperdicia" los días que quedaban)
        expect(diasRestantes).toBeGreaterThanOrEqual(39);
        expect(diasRestantes).toBeLessThanOrEqual(40);
    });
});

describe('DELETE /api/users/:id (deleteStudent)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).delete('/api/users/507f1f77bcf86cd799439011')).status).toBe(401);
    });

    it('borra al alumno correctamente', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).delete(`/api/users/${student._id}`).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(await User.findById(student._id)).toBeNull();
    });

    it('IDOR: un admin no puede borrar un alumno de otro admin', async () => {
        const { admin: adminA } = await createAdmin();
        const { token: tokenB } = await createAdmin();
        const { student } = await createStudentDirect(adminA._id);
        const res = await request(app).delete(`/api/users/${student._id}`).set('Authorization', `Bearer ${tokenB}`);
        expect(res.status).toBe(404);
        expect(await User.findById(student._id)).not.toBeNull();
    });

    it('BUG: borrar un alumno deja huérfanos sus Plan/WorkoutLog en la base (no se limpian)', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id);
        await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Día 1' });

        await request(app).delete(`/api/users/${student._id}`).set('Authorization', `Bearer ${token}`);

        expect(await Plan.countDocuments({ alumnoId: student._id })).toBe(1);
        expect(await WorkoutLog.countDocuments({ alumnoId: student._id })).toBe(1);
    });
});
