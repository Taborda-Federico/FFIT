const request = require('supertest');
const app = require('../../src/app');
const Plan = require('../../src/models/Plan');
const nodemailer = require('nodemailer');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect, createPlanDirect, buildSesion } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); nodemailer.__resetMailMock(); });
afterAll(async () => { await closeDatabase(); });

describe('POST /api/planes/publicar (publicarPlan)', () => {
    it('sin token / con token de alumno → 401', async () => {
        const res1 = await request(app).post('/api/planes/publicar').send({});
        expect(res1.status).toBe(401);
        const { admin } = await createAdmin();
        const { token } = await createStudentDirect(admin._id);
        const res2 = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({});
        expect(res2.status).toBe(401);
    });

    it('camino feliz: crea el plan, queda activo, y le manda un email al alumno', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, titulo: 'Fuerza Nivel 1', vencimiento: 4, sesiones: [buildSesion()]
        });
        expect(res.status).toBe(201);
        expect(res.body.plan.activo).toBe(true);
        expect(nodemailer.__getSentMails()).toHaveLength(1);
        expect(nodemailer.__getSentMails()[0].to).toBe(student.email);
    });

    it('publicar un plan nuevo desactiva los planes anteriores del mismo alumno (pero no toca plantillas)', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const planViejo = await createPlanDirect(admin._id, student._id, { titulo: 'Plan Viejo' });
        const plantilla = await createPlanDirect(admin._id, null, { esPlantilla: true, titulo: 'Plantilla' });

        await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, titulo: 'Plan Nuevo', sesiones: [buildSesion()]
        });

        expect((await Plan.findById(planViejo._id)).activo).toBe(false);
        expect((await Plan.findById(plantilla._id)).activo).toBe(true); // plantilla no se toca
    });

    it('IDOR: un admin no puede publicarle un plan a un alumno de OTRO admin', async () => {
        const { admin: adminA } = await createAdmin();
        const { token: tokenB } = await createAdmin();
        const { student } = await createStudentDirect(adminA._id);

        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${tokenB}`).send({
            alumnoId: student._id, titulo: 'Plan Intruso', sesiones: [buildSesion()]
        });
        expect(res.status).toBe(403);
        expect(await Plan.countDocuments({ alumnoId: student._id })).toBe(0);
    });

    it('sin alumnoId → 403 ("alumno no encontrado")', async () => {
        const { token } = await createAdmin();
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            titulo: 'X', sesiones: [buildSesion()]
        });
        expect(res.status).toBe(403);
    });

    it('sin título → falla (ValidationError de Mongoose)', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, sesiones: [buildSesion()]
        });
        expect(res.status).toBe(500);
    });

    it('vencimiento por defecto es 4 semanas si no se especifica', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, titulo: 'X', sesiones: [buildSesion()]
        });
        expect(res.body.plan.vencimiento).toBe(4);
    });

    it('acepta un vencimiento personalizado (2 u 8 semanas, como ofrece el selector del frontend)', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, titulo: 'X', vencimiento: 8, sesiones: [buildSesion()]
        });
        expect(res.body.plan.vencimiento).toBe(8);
    });

    it('BUG (heredado del schema): permite dos sesiones con el mismo nombre en el mismo plan publicado', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, titulo: 'X',
            sesiones: [buildSesion({ nombre: 'Día 1' }), buildSesion({ nombre: 'Día 1' })]
        });
        expect(res.status).toBe(201);
        expect(res.body.plan.sesiones.map(s => s.nombre)).toEqual(['Día 1', 'Día 1']);
    });

    it('si falla el envío del email, el plan se publica igual (201) — el error se traga', async () => {
        nodemailer.__setShouldFailAll(true);
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`).send({
            alumnoId: student._id, titulo: 'X', sesiones: [buildSesion()]
        });
        expect(res.status).toBe(201);
    });

    it('reutilizar sesiones con _id explícito (como al cargar una plantilla) en DOS planes distintos produce _id de subdocumento repetidos entre ambos', async () => {
        const { token, admin } = await createAdmin();
        const { student: alumno1 } = await createStudentDirect(admin._id);
        const { student: alumno2 } = await createStudentDirect(admin._id);
        const plantilla = await createPlanDirect(admin._id, null, { esPlantilla: true });
        const sesionCompartida = plantilla.sesiones[0].toObject();

        const res1 = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`)
            .send({ alumnoId: alumno1._id, titulo: 'P1', sesiones: [sesionCompartida] });
        const res2 = await request(app).post('/api/planes/publicar').set('Authorization', `Bearer ${token}`)
            .send({ alumnoId: alumno2._id, titulo: 'P2', sesiones: [sesionCompartida] });

        expect(res1.body.plan.sesiones[0]._id).toBe(res2.body.plan.sesiones[0]._id);
    });
});

describe('POST /api/planes/plantilla (guardarPlantilla)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).post('/api/planes/plantilla').send({})).status).toBe(401);
    });

    it('camino feliz: crea una plantilla (esPlantilla=true, sin alumnoId)', async () => {
        const { token } = await createAdmin();
        const res = await request(app).post('/api/planes/plantilla').set('Authorization', `Bearer ${token}`).send({
            titulo: 'Plantilla Hipertrofia', sesiones: [buildSesion()]
        });
        expect(res.status).toBe(201);
        expect(res.body.plantilla.esPlantilla).toBe(true);
        expect(res.body.plantilla.alumnoId).toBeNull();
    });

    it('sin título → falla', async () => {
        const { token } = await createAdmin();
        const res = await request(app).post('/api/planes/plantilla').set('Authorization', `Bearer ${token}`).send({ sesiones: [] });
        expect(res.status).toBe(500);
    });
});

describe('GET /api/planes/plantillas (getPlantillas)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).get('/api/planes/plantillas')).status).toBe(401);
    });

    it('IDOR: cada admin ve solo SUS plantillas (ya estaba corregido, se confirma que sigue así)', async () => {
        const { token: tokenA, admin: adminA } = await createAdmin();
        const { admin: adminB } = await createAdmin();
        await createPlanDirect(adminA._id, null, { esPlantilla: true, titulo: 'De A' });
        await createPlanDirect(adminB._id, null, { esPlantilla: true, titulo: 'De B' });

        const res = await request(app).get('/api/planes/plantillas').set('Authorization', `Bearer ${tokenA}`);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].titulo).toBe('De A');
    });

    it('no incluye planes reales asignados a alumnos, solo esPlantilla=true', async () => {
        const { token, admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { titulo: 'Plan real' });
        await createPlanDirect(admin._id, null, { esPlantilla: true, titulo: 'Plantilla real' });

        const res = await request(app).get('/api/planes/plantillas').set('Authorization', `Bearer ${token}`);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].titulo).toBe('Plantilla real');
    });

    it('devuelve las plantillas ordenadas de la más nueva a la más vieja', async () => {
        const { token, admin } = await createAdmin();
        await createPlanDirect(admin._id, null, { esPlantilla: true, titulo: 'Vieja' });
        await new Promise(r => setTimeout(r, 5));
        await createPlanDirect(admin._id, null, { esPlantilla: true, titulo: 'Nueva' });
        const res = await request(app).get('/api/planes/plantillas').set('Authorization', `Bearer ${token}`);
        expect(res.body[0].titulo).toBe('Nueva');
    });
});

describe('No existen endpoints de edición/borrado de plan ni de plantilla', () => {
    it('no hay ninguna ruta PUT/DELETE bajo /api/planes/ para editar o borrar un plan existente', async () => {
        const { token, admin } = await createAdmin();
        const plan = await createPlanDirect(admin._id, null, { esPlantilla: true });
        const put = await request(app).put(`/api/planes/${plan._id}`).set('Authorization', `Bearer ${token}`).send({ titulo: 'Editado' });
        const del = await request(app).delete(`/api/planes/${plan._id}`).set('Authorization', `Bearer ${token}`);
        // No existen: Express responde 404 (no matchea ninguna ruta definida).
        expect(put.status).toBe(404);
        expect(del.status).toBe(404);
    });
});
