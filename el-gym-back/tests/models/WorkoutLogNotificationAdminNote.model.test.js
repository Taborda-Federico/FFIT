const WorkoutLog = require('../../src/models/WorkoutLog');
const Notification = require('../../src/models/Notification');
const AdminNote = require('../../src/models/AdminNote');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Modelo WorkoutLog', () => {
    let student;
    beforeEach(async () => {
        const { admin } = await createAdmin();
        ({ student } = await createStudentDirect(admin._id));
    });

    it('rechaza un log sin alumnoId', async () => {
        await expect(WorkoutLog.create({ nombreSesion: 'Día 1' })).rejects.toThrow();
    });

    it('rechaza un log sin nombreSesion', async () => {
        await expect(WorkoutLog.create({ alumnoId: student._id })).rejects.toThrow();
    });

    it('duracion por defecto es "45m"', async () => {
        const log = await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Día 1' });
        expect(log.duracion).toBe('45m');
    });

    it('no tiene ningún campo planId / referencia al plan que originó la sesión', async () => {
        // Esto significa que el backend no puede verificar que un WorkoutLog
        // corresponda a una sesión real del plan activo del alumno: acepta
        // cualquier nombreSesion/ejercicios que el cliente mande.
        const log = await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Sesión inventada que no existe en ningún plan' });
        expect(log.planId).toBeUndefined();
    });

    it('no tiene ningún campo pesoTotal (el frontend lo manda pero se descarta)', async () => {
        const log = await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Día 1', pesoTotal: 999 });
        expect(log.pesoTotal).toBeUndefined();
    });

    it('acepta ejercicios embebidos con pesoUsado por defecto 0', async () => {
        const log = await WorkoutLog.create({
            alumnoId: student._id, nombreSesion: 'Día 1',
            ejercicios: [{ ejercicioId: 'abc', nombre: 'Press' }]
        });
        expect(log.ejercicios[0].pesoUsado).toBe(0);
    });

    it('rechaza un ejercicio embebido sin nombre', async () => {
        await expect(WorkoutLog.create({
            alumnoId: student._id, nombreSesion: 'Día 1',
            ejercicios: [{ ejercicioId: 'abc' }]
        })).rejects.toThrow();
    });

    it('tiene timestamps automáticos (createdAt es la fecha "real" del entrenamiento)', async () => {
        const log = await WorkoutLog.create({ alumnoId: student._id, nombreSesion: 'Día 1' });
        expect(log.createdAt).toBeInstanceOf(Date);
    });
});

describe('Modelo Notification', () => {
    let student;
    beforeEach(async () => {
        const { admin } = await createAdmin();
        ({ student } = await createStudentDirect(admin._id));
    });

    it('rechaza sin alumnoId/titulo/mensaje', async () => {
        await expect(Notification.create({ titulo: 'X', mensaje: 'Y' })).rejects.toThrow();
        await expect(Notification.create({ alumnoId: student._id, mensaje: 'Y' })).rejects.toThrow();
        await expect(Notification.create({ alumnoId: student._id, titulo: 'X' })).rejects.toThrow();
    });

    it('tipo por defecto es "INFO"', async () => {
        const n = await Notification.create({ alumnoId: student._id, titulo: 'X', mensaje: 'Y' });
        expect(n.tipo).toBe('INFO');
    });

    it('acepta los 4 tipos del enum', async () => {
        for (const tipo of ['INFO', 'PLAN', 'ALERTA', 'PAGO']) {
            const n = await Notification.create({ alumnoId: student._id, titulo: 'X', mensaje: 'Y', tipo });
            expect(n.tipo).toBe(tipo);
        }
    });

    it('rechaza un tipo fuera del enum', async () => {
        await expect(Notification.create({ alumnoId: student._id, titulo: 'X', mensaje: 'Y', tipo: 'SPAM' })).rejects.toThrow();
    });

    it('leida por defecto es false', async () => {
        const n = await Notification.create({ alumnoId: student._id, titulo: 'X', mensaje: 'Y' });
        expect(n.leida).toBe(false);
    });
});

describe('Modelo AdminNote', () => {
    let admin, student;
    beforeEach(async () => {
        ({ admin } = await createAdmin());
        ({ student } = await createStudentDirect(admin._id));
    });

    it('rechaza sin alumnoId/adminId/contenido', async () => {
        await expect(AdminNote.create({ adminId: admin._id, contenido: 'x' })).rejects.toThrow();
        await expect(AdminNote.create({ alumnoId: student._id, contenido: 'x' })).rejects.toThrow();
        await expect(AdminNote.create({ alumnoId: student._id, adminId: admin._id })).rejects.toThrow();
    });

    it('fecha por defecto es Date.now', async () => {
        const nota = await AdminNote.create({ alumnoId: student._id, adminId: admin._id, contenido: 'ok' });
        expect(nota.fecha).toBeInstanceOf(Date);
    });

    it('tiene timestamps además del campo `fecha` propio (dos fechas redundantes)', async () => {
        const nota = await AdminNote.create({ alumnoId: student._id, adminId: admin._id, contenido: 'ok' });
        expect(nota.createdAt).toBeInstanceOf(Date);
        expect(nota.fecha).toBeInstanceOf(Date);
    });
});
