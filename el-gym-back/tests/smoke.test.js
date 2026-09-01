const request = require('supertest');
const app = require('../src/app');
const { connect, closeDatabase, clearDatabase } = require('./helpers/db');
const { createAdmin } = require('./helpers/factories');
const nodemailer = require('nodemailer');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); nodemailer.__resetMailMock(); });
afterAll(async () => { await closeDatabase(); });

describe('smoke test de infraestructura', () => {
    it('la app responde en /', async () => {
        const res = await request(app).get('/');
        expect(res.status).toBe(200);
    });

    it('puede crear un admin en Mongo en memoria y loguearse', async () => {
        const { admin } = await createAdmin({ email: 'smoke@ffit.test', password: 'secret123' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'smoke@ffit.test', password: 'secret123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.role).toBe('admin');
        expect(admin.email).toBe('smoke@ffit.test');
    });

    it('nodemailer está mockeado (no intenta SMTP real)', async () => {
        const transporter = nodemailer.createTransport({});
        await transporter.sendMail({ to: 'x@x.com', subject: 'hola' });
        expect(nodemailer.__getSentMails()).toHaveLength(1);
    });
});
