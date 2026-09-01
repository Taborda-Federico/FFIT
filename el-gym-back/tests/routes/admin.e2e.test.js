const request = require('supertest');
const app = require('../../src/app');
const AdminNote = require('../../src/models/AdminNote');
const WorkoutLog = require('../../src/models/WorkoutLog');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('GET /api/admin/student-progress/:alumnoId (adminController.getStudentProgress)', () => {
    it('sin token / con token de alumno → 401', async () => {
        const res1 = await request(app).get('/api/admin/student-progress/507f1f77bcf86cd799439011');
        expect(res1.status).toBe(401);
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        const res2 = await request(app).get('/api/admin/student-progress/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${token}`);
        expect(res2.status).toBe(401);
    });

    it('IDOR: un admin no puede ver el progreso de un alumno de OTRO admin → 403', async () => {
        const { admin: adminA } = await createAdmin();
        const { token: tokenB } = await createAdmin();
        const { student } = await createStudentDirect(adminA._id);
        const res = await request(app).get(`/api/admin/student-progress/${student._id}`).set('Authorization', `Bearer ${tokenB}`);
        expect(res.status).toBe(403);
    });

    it('alumnoId inexistente → 403 (mismo mensaje que IDOR, no distingue "no existe" de "no es tuyo")', async () => {
        const { token } = await createAdmin();
        const res = await request(app).get('/api/admin/student-progress/507f1f77bcf86cd799439011').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it('devuelve el historial de entrenamientos y las notas del alumno, ordenados del más nuevo al más viejo', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Vieja', createdAt: new Date('2020-01-01') });
        await WorkoutLog.collection.updateOne({ alumnoId: student._id }, { $set: { createdAt: new Date('2020-01-01') } });
        await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Nueva' });
        await AdminNote.create({ alumnoId: student._id, adminId: admin._id, contenido: 'Nota 1' });

        const res = await request(app).get(`/api/admin/student-progress/${student._id}`).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.historial[0].nombreSesion).toBe('Nueva');
        expect(res.body.notas).toHaveLength(1);
    });

    it('límite de 50 registros de historial', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const logs = Array.from({ length: 55 }, (_, i) => ({ alumnoId: student._id, nombreSesion: `S${i}` }));
        await WorkoutLog.insertMany(logs);
        const res = await request(app).get(`/api/admin/student-progress/${student._id}`).set('Authorization', `Bearer ${token}`);
        expect(res.body.historial).toHaveLength(50);
    });
});

describe('POST /api/admin/student-notes (adminController.createAdminNote)', () => {
    it('sin token → 401', async () => {
        const res = await request(app).post('/api/admin/student-notes').send({});
        expect(res.status).toBe(401);
    });

    it('IDOR: no se puede crear una nota para un alumno de OTRO admin → 403, no crea la nota', async () => {
        const { admin: adminA } = await createAdmin();
        const { token: tokenB } = await createAdmin();
        const { student } = await createStudentDirect(adminA._id);
        const res = await request(app).post('/api/admin/student-notes').set('Authorization', `Bearer ${tokenB}`)
            .send({ alumnoId: student._id, contenido: 'Nota intrusa' });
        expect(res.status).toBe(403);
        expect(await AdminNote.countDocuments({ alumnoId: student._id })).toBe(0);
    });

    it('camino feliz: crea la nota asociada al admin y al alumno correctos', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/admin/student-notes').set('Authorization', `Bearer ${token}`)
            .send({ alumnoId: student._id, contenido: 'Buena progresión en sentadilla' });
        expect(res.status).toBe(201);
        const nota = await AdminNote.findOne({ alumnoId: student._id });
        expect(nota.adminId.toString()).toBe(admin._id.toString());
        expect(nota.contenido).toBe('Buena progresión en sentadilla');
    });

    it('sin contenido → falla (required en el schema)', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/admin/student-notes').set('Authorization', `Bearer ${token}`)
            .send({ alumnoId: student._id });
        expect(res.status).toBe(500);
    });

    it('un token de alumno (no admin) no puede crear notas', async () => {
        const { admin } = await createAdmin();
        const { student, token } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/admin/student-notes').set('Authorization', `Bearer ${token}`)
            .send({ alumnoId: student._id, contenido: 'x' });
        expect(res.status).toBe(401);
    });
});
