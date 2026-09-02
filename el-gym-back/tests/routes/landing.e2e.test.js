const request = require('supertest');
const app = require('../../src/app');
const Landing = require('../../src/models/Landing');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('GET /api/landing/my-site (getMiLanding)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).get('/api/landing/my-site')).status).toBe(401);
    });

    it('si el admin nunca configuró su landing, devuelve estructura vacía en vez de 404', async () => {
        const { token } = await createAdmin();
        const res = await request(app).get('/api/landing/my-site').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ heroBackgrounds: [], clases: [], coaches: [] });
    });

    it('IDOR: cada admin ve solo SU landing, no la de otro admin', async () => {
        const { token: tokenA, admin: adminA } = await createAdmin();
        const { admin: adminB } = await createAdmin();
        await Landing.create({ adminId: adminB._id, clases: [{ title: 'De B' }] });
        const res = await request(app).get('/api/landing/my-site').set('Authorization', `Bearer ${tokenA}`);
        expect(res.body).toEqual({ heroBackgrounds: [], clases: [], coaches: [] });
    });
});

describe('PUT /api/landing/my-site (updateMiLanding)', () => {
    it('sin token → 401', async () => {
        expect((await request(app).put('/api/landing/my-site').send({})).status).toBe(401);
    });

    it('crea la landing si no existía (upsert)', async () => {
        const { token, admin } = await createAdmin();
        const res = await request(app).put('/api/landing/my-site').set('Authorization', `Bearer ${token}`).send({
            heroBackgrounds: [{ id: 1, url: 'https://x.com/img.jpg' }],
            clases: [{ id: 1, title: 'Funcional' }],
            coaches: []
        });
        expect(res.status).toBe(200);
        expect(await Landing.countDocuments({ adminId: admin._id })).toBe(1);
    });

    it('actualiza (no duplica) si ya existía', async () => {
        const { token, admin } = await createAdmin();
        await Landing.create({ adminId: admin._id, clases: [{ title: 'Vieja' }] });
        await request(app).put('/api/landing/my-site').set('Authorization', `Bearer ${token}`).send({ clases: [{ title: 'Nueva' }] });
        expect(await Landing.countDocuments({ adminId: admin._id })).toBe(1);
        const actual = await Landing.findOne({ adminId: admin._id });
        expect(actual.clases[0].title).toBe('Nueva');
    });

    it('IDOR: el admin B no puede pisar la landing del admin A (el filtro de upsert usa req.user._id)', async () => {
        const { admin: adminA } = await createAdmin();
        const { token: tokenB } = await createAdmin();
        await Landing.create({ adminId: adminA._id, clases: [{ title: 'De A' }] });
        await request(app).put('/api/landing/my-site').set('Authorization', `Bearer ${tokenB}`).send({ clases: [{ title: 'Intento de B' }] });
        const deA = await Landing.findOne({ adminId: adminA._id });
        expect(deA.clases[0].title).toBe('De A');
    });
});

describe('GET /api/landing/public (getPublicLanding)', () => {
    it('no requiere token', async () => {
        const res = await request(app).get('/api/landing/public');
        expect(res.status).toBe(200);
    });

    it('BUG DE DISEÑO: con más de un gimnasio/admin usando la app, devuelve la landing del primer Landing.findOne() sin filtrar — no hay forma de tener múltiples landings públicas distintas', async () => {
        const { admin: adminA } = await createAdmin();
        const { admin: adminB } = await createAdmin();
        await Landing.create({ adminId: adminA._id, clases: [{ title: 'Gym A' }] });
        await Landing.create({ adminId: adminB._id, clases: [{ title: 'Gym B' }] });
        const res = await request(app).get('/api/landing/public');
        // getPublicLanding hace `Landing.findOne()` sin ningún filtro: devuelve
        // "una" landing cualquiera (la primera que Mongo encuentre), no la del
        // gimnasio "dueño" del dominio. Esto solo tiene sentido para un
        // despliegue de un único gimnasio.
        expect(['Gym A', 'Gym B']).toContain(res.body.clases[0].title);
    });
});
