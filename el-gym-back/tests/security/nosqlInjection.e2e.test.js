// No hay ningún middleware de sanitización de body (express-mongo-sanitize
// o similar) en src/app.js. Los controllers arman queries de Mongo
// directamente con valores de req.body (ej. `User.findOne({ email })`).
// Este archivo prueba, contra Mongo real (mongodb-memory-server), si eso
// es explotable como inyección NoSQL vía operadores de Mongo ($gt, $ne, $regex...).
const request = require('supertest');
const app = require('../../src/app');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Inyección NoSQL en POST /api/auth/login', () => {
    beforeEach(async () => {
        await createAdmin({ email: 'victima@x.com', password: 'passwordSecreta123' });
    });

    const payloadsInyeccion = [
        { email: { $gt: '' }, password: { $gt: '' } },
        { email: { $ne: null }, password: { $ne: null } },
        { email: 'victima@x.com', password: { $gt: '' } },
        { email: 'victima@x.com', password: { $ne: 'noesestaseguro' } },
        { email: { $regex: '^victima' }, password: { $gt: '' } },
    ];

    it.each(payloadsInyeccion)('payload %j NO loguea (Mongoose castea el path String y tira CastError → 500, no 200)', async (payload) => {
        const res = await request(app).post('/api/auth/login').send(payload);
        // Verificación explícita: bajo NINGÚN payload de operador Mongo se
        // devuelve un login exitoso (200 con token). El resultado real puede
        // ser 401 (si Mongoose ignora/castea el operador a string y no
        // matchea nada) o 500 (si tira CastError) — ambos son "seguro" acá;
        // lo que NO es aceptable es 200.
        expect(res.status).not.toBe(200);
        expect(res.body.token).toBeUndefined();
    });

    it('un login legítimo (string normal) sigue funcionando después de estos intentos (no rompimos nada permanente)', async () => {
        const res = await request(app).post('/api/auth/login').send({ email: 'victima@x.com', password: 'passwordSecreta123' });
        expect(res.status).toBe(200);
    });
});

describe('Inyección NoSQL en la verificación de email/dni duplicado (createStudent, registerAdmin)', () => {
    it('POST /api/auth/register-admin con email como operador Mongo no crea un admin ni causa un 200/201 inesperado', async () => {
        const res = await request(app).post('/api/auth/register-admin').send({
            nombre: 'X', email: { $gt: '' }, password: 'x123456',
            adminSecret: process.env.ADMIN_REGISTRATION_SECRET
        });
        expect([400, 401, 500]).toContain(res.status);
    });

    it('POST /api/users (createStudent) con dni como operador Mongo no crea el alumno ni devuelve 201', async () => {
        const { token } = await createAdmin();
        const res = await request(app).post('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .send({ nombre: 'X', dni: { $gt: '' }, email: 'x@x.com', telefono: '123', montoPago: '100' });
        expect(res.status).not.toBe(201);
    });
});

describe('Cabeceras de seguridad (helmet) y CORS', () => {
    it('helmet agrega X-Content-Type-Options: nosniff', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('helmet NO expone X-Powered-By: Express', async () => {
        const res = await request(app).get('/');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('CORS: un origin permitido (localhost:5173) recibe Access-Control-Allow-Origin con ese origin', async () => {
        const res = await request(app).get('/').set('Origin', 'http://localhost:5173');
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('CORS: un origin NO permitido no recibe el header Access-Control-Allow-Origin', async () => {
        const res = await request(app).get('/').set('Origin', 'https://sitio-malicioso.com');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});

describe('Rate limiting (express-rate-limit) en /api/', () => {
    it('las respuestas incluyen headers RateLimit-* (política activa)', async () => {
        const res = await request(app).get('/api/planes/plantillas');
        const tieneHeaderRateLimit = res.headers['ratelimit-limit'] !== undefined || res.headers['x-ratelimit-limit'] !== undefined;
        expect(tieneHeaderRateLimit).toBe(true);
    });

    it('el límite configurado es 1000 req/15min por IP — no hay un límite más estricto específico para /auth/login (sin protección extra anti fuerza-bruta)', async () => {
        const res = await request(app).get('/api/planes/plantillas');
        const limite = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
        expect(Number(limite)).toBe(1000);
    });

    it('20 intentos de login fallidos seguidos NO son bloqueados (sin límite específico de fuerza bruta en /login)', async () => {
        await createAdmin({ email: 'bruteforce@x.com', password: 'laVerdadera123' });
        let ultimoStatus;
        for (let i = 0; i < 20; i++) {
            const res = await request(app).post('/api/auth/login').send({ email: 'bruteforce@x.com', password: `intento${i}` });
            ultimoStatus = res.status;
        }
        // Si hubiera un límite anti fuerza-bruta específico, el intento 20
        // debería devolver 429. Documentamos que no es el caso.
        expect(ultimoStatus).toBe(401);
    }, 20000);
});
