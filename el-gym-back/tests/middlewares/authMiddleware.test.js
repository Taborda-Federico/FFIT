const jwt = require('jsonwebtoken');
const { protect, admin } = require('../../src/middlewares/authMiddleware');
const User = require('../../src/models/User');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect, makeToken } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

// Mock mínimo de req/res/next para testear el middleware de forma aislada,
// sin levantar un servidor HTTP real.
function mockRes() {
    const res = {};
    res.statusCode = null;
    res.body = null;
    res.status = jest.fn((code) => { res.statusCode = code; return res; });
    res.json = jest.fn((body) => { res.body = body; return res; });
    return res;
}

describe('authMiddleware.protect', () => {
    it('sin header Authorization → 401 "no hay token"', async () => {
        const req = { headers: {} };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.body.message).toMatch(/no hay token/i);
        expect(next).not.toHaveBeenCalled();
    });

    it('header Authorization sin esquema Bearer (ej. "Basic xxx") → 401, una sola vez', async () => {
        const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('token con formato inválido (no es un JWT real) → 401 "token falló"', async () => {
        const req = { headers: { authorization: 'Bearer no.es.un.jwt.valido' } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.body.message).toMatch(/token falló/i);
        expect(next).not.toHaveBeenCalled();
    });

    it('token expirado → 401', async () => {
        const { admin: adminUser } = await createAdmin();
        const tokenExpirado = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '-1s' });
        const req = { headers: { authorization: `Bearer ${tokenExpirado}` } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('token firmado con un secreto distinto → 401 (no acepta firmas ajenas)', async () => {
        const { admin: adminUser } = await createAdmin();
        const tokenApocrifo = jwt.sign({ id: adminUser._id }, 'otro-secreto-cualquiera', { expiresIn: '1d' });
        const req = { headers: { authorization: `Bearer ${tokenApocrifo}` } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('token válido → setea req.user (sin password) y llama a next()', async () => {
        const { admin: adminUser, token } = await createAdmin({ nombre: 'Coach' });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();
        expect(req.user._id.toString()).toBe(adminUser._id.toString());
        expect(req.user.password).toBeUndefined();
    });

    it('ARREGLADO: "Authorization: Bearer" sin ningún token después → responde 401 UNA sola vez', async () => {
        // req.headers.authorization === 'Bearer' (sin espacio ni token).
        // 'Bearer'.split(' ')[1] === undefined → jwt.verify(undefined, ...) tira
        // sincrónicamente dentro del try → responde 401 en el catch. Antes,
        // como `token` seguía siendo undefined después del try/catch, la
        // ejecución seguía de largo hasta el `if (!token)` final y respondía
        // 401 OTRA VEZ (en Express real, "Cannot set headers after they are
        // sent"). Ahora el `return` corta la ejecución en el catch.
        const req = { headers: { authorization: 'Bearer' } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
    });

    it('ARREGLADO (variante): "Authorization: Bearer " con espacio de más y nada después → también responde una sola vez', async () => {
        const req = { headers: { authorization: 'Bearer ' } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(res.status).toHaveBeenCalledTimes(1);
    });

    it('ARREGLADO: token válido pero el usuario ya no existe en la DB (fue borrado) → 401 claro, no deja pasar con req.user null', async () => {
        const { admin: adminUser, token } = await createAdmin();
        await User.findByIdAndDelete(adminUser._id);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();
        await protect(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.body.message).toMatch(/ya no existe/i);
    });
});

describe('authMiddleware.admin', () => {
    it('req.user.role === "admin" → llama a next()', () => {
        const req = { user: { role: 'admin' } };
        const res = mockRes();
        const next = jest.fn();
        admin(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('req.user.role === "user" → 401 "Solo Administradores"', () => {
        const req = { user: { role: 'user' } };
        const res = mockRes();
        const next = jest.fn();
        admin(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.body.message).toMatch(/Solo Administradores/i);
        expect(next).not.toHaveBeenCalled();
    });

    it('req.user es null → 401, no explota con TypeError (defensivo: hoy protect() ya corta antes de llegar acá, ver arriba)', () => {
        const req = { user: null };
        const res = mockRes();
        const next = jest.fn();
        expect(() => admin(req, res, next)).not.toThrow();
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it('usa código 401 en vez de 403 para "rol incorrecto" (inconsistente con la semántica REST habitual)', () => {
        // No es "no autenticado" (401), es "autenticado pero sin permiso" (403).
        // Se documenta como hallazgo de estilo/semántica HTTP, no como bug funcional.
        const req = { user: { role: 'user' } };
        const res = mockRes();
        admin(req, res, jest.fn());
        expect(res.statusCode).toBe(401);
    });
});

describe('authMiddleware.protect + admin encadenados vía HTTP real (Supertest)', () => {
    const request = require('supertest');
    const app = require('../../src/app');

    it('un token de alumno (no admin) no puede pegarle a una ruta protegida con admin', async () => {
        const { admin: adminUser } = await createAdmin();
        const { token } = await createStudentDirect(adminUser._id);
        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(401);
    });

    it('sin token, una ruta protegida devuelve 401 (no 500 ni 200)', async () => {
        const res = await request(app).get('/api/users');
        expect(res.status).toBe(401);
    });
});
