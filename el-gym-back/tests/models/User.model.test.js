const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { unique } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Modelo User', () => {
    describe('hashing de contraseña', () => {
        it('hashea la contraseña al crear el usuario (no la guarda en texto plano)', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'plano123' });
            expect(user.password).not.toBe('plano123');
            expect(user.password.length).toBeGreaterThan(20);
        });

        it('el hash es un bcrypt válido ($2 prefix)', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'plano123' });
            expect(user.password).toMatch(/^\$2[aby]\$/);
        });

        it('matchPassword devuelve true con la contraseña correcta', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'correcta123' });
            await expect(user.matchPassword('correcta123')).resolves.toBe(true);
        });

        it('matchPassword devuelve false con una contraseña incorrecta', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'correcta123' });
            await expect(user.matchPassword('incorrecta')).resolves.toBe(false);
        });

        it('NO re-hashea la contraseña si se guarda el doc sin tocar el password (evita doble-hash)', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'correcta123' });
            const hashOriginal = user.password;
            user.nombre = 'A modificado';
            await user.save();
            expect(user.password).toBe(hashOriginal);
            await expect(user.matchPassword('correcta123')).resolves.toBe(true);
        });

        it('SÍ re-hashea cuando se cambia explícitamente el password', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'vieja123' });
            const hashViejo = user.password;
            user.password = 'nueva456';
            await user.save();
            expect(user.password).not.toBe(hashViejo);
            await expect(user.matchPassword('nueva456')).resolves.toBe(true);
            await expect(user.matchPassword('vieja123')).resolves.toBe(false);
        });

        it('dos usuarios con la misma contraseña obtienen hashes distintos (salt distinto)', async () => {
            const u1 = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'igual123' });
            const u2 = await User.create({ nombre: 'B', email: `${unique('b')}@x.com`, password: 'igual123' });
            expect(u1.password).not.toBe(u2.password);
        });
    });

    describe('validación de campos requeridos', () => {
        it('rechaza un usuario sin nombre', async () => {
            await expect(User.create({ email: `${unique('a')}@x.com`, password: 'x123456' })).rejects.toThrow();
        });

        it('rechaza un usuario sin email', async () => {
            await expect(User.create({ nombre: 'A', password: 'x123456' })).rejects.toThrow();
        });

        it('rechaza un usuario sin password', async () => {
            await expect(User.create({ nombre: 'A', email: `${unique('a')}@x.com` })).rejects.toThrow();
        });

        it('NO rechaza un dni ausente (dni no es required en el schema)', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456' });
            expect(user.dni).toBeUndefined();
        });

        it('un nombre vacío ("") SÍ es rechazado por required (Mongoose 8 valida string vacío)', async () => {
            // Nota para quien lea este test: en versiones viejas de Mongoose,
            // required:true en un String no rechazaba '' (solo null/undefined).
            // Se verificó acá contra la versión real del proyecto (mongoose 8.3.2)
            // y SÍ lo rechaza — documentamos el comportamiento real, no el supuesto.
            await expect(User.create({ nombre: '', email: `${unique('a')}@x.com`, password: 'x123456' }))
                .rejects.toThrow(/nombre/);
        });
    });

    describe('unicidad de email', () => {
        it('el índice único rechaza un email duplicado exacto', async () => {
            await User.init(); // asegura que el índice único ya se construyó
            await User.create({ nombre: 'A', email: 'dup@x.com', password: 'x123456' });
            await expect(User.create({ nombre: 'B', email: 'dup@x.com', password: 'y123456' })).rejects.toThrow();
        });

        it('BUG: el índice único es case-sensitive, "Dup@x.com" y "dup@x.com" conviven', async () => {
            await User.init();
            await User.create({ nombre: 'A', email: 'CaseTest@x.com', password: 'x123456' });
            // Este create NO debería lograrse si el sistema tratara los emails como
            // case-insensitive (que es lo que un usuario esperaría) — pero como el
            // schema no tiene `lowercase: true`, esto pasa sin error.
            const segundo = await User.create({ nombre: 'B', email: 'casetest@x.com', password: 'y123456' });
            expect(segundo._id).toBeDefined();
            const count = await User.countDocuments({ email: { $regex: /^casetest@x\.com$/i } });
            expect(count).toBe(2);
        });
    });

    describe('enum de role y estado', () => {
        it('default role es "user" si no se especifica', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456' });
            expect(user.role).toBe('user');
        });

        it('rechaza un role fuera del enum', async () => {
            await expect(User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456', role: 'superadmin' }))
                .rejects.toThrow();
        });

        it('default estado es "Pendiente" si no se especifica', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456' });
            expect(user.estado).toBe('Pendiente');
        });

        it('rechaza un estado fuera del enum', async () => {
            await expect(User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456', estado: 'Moroso' }))
                .rejects.toThrow();
        });
    });

    describe('otros campos', () => {
        it('no existe un campo "domicilio" ni "celular" en el schema (quedan fuera del documento)', async () => {
            const user = await User.create({
                nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456',
                domicilio: 'Calle Falsa 123', celular: '1122334455'
            });
            expect(user.domicilio).toBeUndefined();
            expect(user.celular).toBeUndefined();
            const raw = await User.collection.findOne({ _id: user._id });
            expect(raw.domicilio).toBeUndefined();
            expect(raw.celular).toBeUndefined();
        });

        it('tiene timestamps (createdAt/updatedAt) automáticos', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456' });
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('peso y altura aceptan números', async () => {
            const user = await User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456', peso: 80.5, altura: 178 });
            expect(user.peso).toBe(80.5);
            expect(user.altura).toBe(178);
        });

        it('peso con un string no numérico lanza CastError', async () => {
            await expect(User.create({ nombre: 'A', email: `${unique('a')}@x.com`, password: 'x123456', peso: 'ochenta' }))
                .rejects.toThrow();
        });

        it('un email con forma de objeto de operador Mongo ($gt) es rechazado por el cast a String', async () => {
            // Verificación defensiva: si esto NO lanzara, sería una puerta a
            // inyección NoSQL vía Mongoose (ver también tests/security/*).
            await expect(User.create({ nombre: 'A', email: { $gt: '' }, password: 'x123456' })).rejects.toThrow();
        });
    });
});
