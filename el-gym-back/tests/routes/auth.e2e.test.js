const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, makeToken } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('POST /api/auth/register-admin', () => {
    it('sin adminSecret o con uno incorrecto → 401, no crea el usuario', async () => {
        const res = await request(app).post('/api/auth/register-admin').send({
            nombre: 'Nuevo', email: 'nuevo@x.com', password: 'x123456', adminSecret: 'incorrecto'
        });
        expect(res.status).toBe(401);
        expect(await User.countDocuments({ email: 'nuevo@x.com' })).toBe(0);
    });

    it('con el adminSecret correcto → 201, crea un admin y devuelve token', async () => {
        const res = await request(app).post('/api/auth/register-admin').send({
            nombre: 'Nuevo', email: 'nuevo2@x.com', password: 'x123456',
            adminSecret: process.env.ADMIN_REGISTRATION_SECRET
        });
        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.role).toBe('admin');
    });

    it('email duplicado (aunque el secret sea correcto) → 400', async () => {
        await createAdmin({ email: 'dup@x.com' });
        const res = await request(app).post('/api/auth/register-admin').send({
            nombre: 'Otro', email: 'dup@x.com', password: 'x123456',
            adminSecret: process.env.ADMIN_REGISTRATION_SECRET
        });
        expect(res.status).toBe(400);
    });

    it('sin password → 500 (Mongoose ValidationError sin manejo específico)', async () => {
        const res = await request(app).post('/api/auth/register-admin').send({
            nombre: 'Sin pass', email: 'sinpass@x.com',
            adminSecret: process.env.ADMIN_REGISTRATION_SECRET
        });
        expect(res.status).toBe(500);
    });
});

describe('POST /api/auth/create-admin (requiere ya ser admin)', () => {
    it('sin token → 401', async () => {
        const res = await request(app).post('/api/auth/create-admin').send({ nombre: 'X', email: 'x@x.com', password: 'x123456' });
        expect(res.status).toBe(401);
    });

    it('con token de alumno (no admin) → 401', async () => {
        const { admin } = await createAdmin();
        const { createStudentDirect } = require('../helpers/factories');
        const { token } = await createStudentDirect(admin._id);
        const res = await request(app).post('/api/auth/create-admin')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'X', email: 'x@x.com', password: 'x123456' });
        expect(res.status).toBe(401);
    });

    it('con token de admin → 201, y NO requiere adminSecret (a diferencia de register-admin)', async () => {
        const { token } = await createAdmin();
        const res = await request(app).post('/api/auth/create-admin')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Colega', email: 'colega@x.com', password: 'x123456' });
        expect(res.status).toBe(201);
        expect(res.body.role).toBe('admin');
    });

    it('el admin recién creado por create-admin NO recibe token en la respuesta (tiene que loguearse aparte)', async () => {
        const { token } = await createAdmin();
        const res = await request(app).post('/api/auth/create-admin')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'Colega2', email: 'colega2@x.com', password: 'x123456' });
        expect(res.body.token).toBeUndefined();
    });
});

describe('POST /api/auth/login', () => {
    it('credenciales correctas → 200 + token', async () => {
        await createAdmin({ email: 'login@x.com', password: 'secreta123' });
        const res = await request(app).post('/api/auth/login').send({ email: 'login@x.com', password: 'secreta123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('contraseña incorrecta → 401 con mensaje genérico', async () => {
        await createAdmin({ email: 'login2@x.com', password: 'secreta123' });
        const res = await request(app).post('/api/auth/login').send({ email: 'login2@x.com', password: 'mala' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/incorrectos/i);
    });

    it('email inexistente → 401 con el MISMO mensaje genérico que contraseña incorrecta (no revela si el usuario existe)', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'noexiste@x.com', password: 'x' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/incorrectos/i);
    });

    it('BUG: el login es case-sensitive en el email — "Test@X.com" y "test@x.com" no son intercambiables', async () => {
        await createAdmin({ email: 'CaseSensible@x.com', password: 'secreta123' });
        const res = await request(app).post('/api/auth/login').send({ email: 'casesensible@x.com', password: 'secreta123' });
        // Un usuario que registró "CaseSensible@x.com" y escribe su email en
        // minúsculas (comportamiento normalísimo, ej. autocapitalize del
        // celular) recibe "credenciales incorrectas" en vez de loguear.
        expect(res.status).toBe(401);
    });

    it('email y password ausentes → 401 (no 500, aunque no haya validación explícita)', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(401);
    });

    it('el JWT devuelto expira en 30 días y contiene el id del usuario', async () => {
        const jwt = require('jsonwebtoken');
        await createAdmin({ email: 'exp@x.com', password: 'secreta123' });
        const res = await request(app).post('/api/auth/login').send({ email: 'exp@x.com', password: 'secreta123' });
        const decoded = jwt.decode(res.body.token);
        const diasHastaExpirar = (decoded.exp - decoded.iat) / (60 * 60 * 24);
        expect(diasHastaExpirar).toBeCloseTo(30, 0);
        expect(decoded.id).toBe(res.body._id);
    });
});
