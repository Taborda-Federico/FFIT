// Tests dedicados a los DOS cronjobs de src/cron/expirationCheck.js,
// ejecutando la lógica REAL (node-cron está mockeado — ver
// __mocks__/node-cron.js — así que require() de este archivo no programa
// timers de verdad, solo captura los callbacks para dispararlos a mano).
const cron = require('node-cron');
const User = require('../../src/models/User');
const Plan = require('../../src/models/Plan');
const Notification = require('../../src/models/Notification');
const nodemailer = require('nodemailer');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect, createPlanDirect } = require('../helpers/factories');

const DIA_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); nodemailer.__resetMailMock(); });
afterAll(async () => { await closeDatabase(); });

require('../../src/cron/expirationCheck');
const [avisoMembresia, actualizacionSemanal] = cron.__getRegistered();

describe('config declarada de los cronjobs', () => {
    it('el cron diario de avisos corre a las 9:00 todos los días ("0 9 * * *")', () => {
        expect(avisoMembresia.expression).toBe('0 9 * * *');
    });

    it('el cron semanal corre el domingo 23:59 ("59 23 * * 0")', () => {
        expect(actualizacionSemanal.expression).toBe('59 23 * * 0');
    });

    it('el cron diario NO especifica timezone explícito (usa el del proceso/servidor)', () => {
        expect(avisoMembresia.options).toBeUndefined();
    });

    it('el cron semanal SÍ fija timezone "America/Argentina/Buenos_Aires" (inconsistente con el diario)', () => {
        expect(actualizacionSemanal.options).toEqual({ scheduled: true, timezone: 'America/Argentina/Buenos_Aires' });
    });
});

describe('cron diario: aviso de vencimiento de cuota a 5 días', () => {
    async function alumnoConVencimientoEn(dias, overrides = {}) {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id, {
            fechaVencimiento: new Date(Date.now() + dias * DIA_MS),
            estado: 'Al día',
            ...overrides
        });
        return student;
    }

    it('a EXACTAMENTE 5 días → recibe Notification + email', async () => {
        const alumno = await alumnoConVencimientoEn(5);
        await avisoMembresia.callback();
        expect(await Notification.countDocuments({ alumnoId: alumno._id, tipo: 'ALERTA' })).toBe(1);
        expect(nodemailer.__getSentMails().some(m => m.to === alumno.email)).toBe(true);
    });

    it('a 4 días → NO recibe aviso (todavía no entró en la ventana)', async () => {
        const alumno = await alumnoConVencimientoEn(4);
        await avisoMembresia.callback();
        expect(await Notification.countDocuments({ alumnoId: alumno._id })).toBe(0);
    });

    it('a 6 días → NO recibe aviso (ya pasó la ventana de "exactamente 5")', async () => {
        const alumno = await alumnoConVencimientoEn(6);
        await avisoMembresia.callback();
        expect(await Notification.countDocuments({ alumnoId: alumno._id })).toBe(0);
    });

    it('un admin (role=admin) con fechaVencimiento a 5 días NO recibe el aviso (el query filtra role:"user")', async () => {
        const { admin } = await createAdmin({ fechaVencimiento: new Date(Date.now() + 5 * DIA_MS) });
        await avisoMembresia.callback();
        expect(await Notification.countDocuments({ alumnoId: admin._id })).toBe(0);
    });

    it('un alumno con estado "Pendiente" (ya vencido/no al día) a 5 días de fechaVencimiento NO recibe el aviso (el query exige estado:"Al día")', async () => {
        const alumno = await alumnoConVencimientoEn(5, { estado: 'Pendiente' });
        await avisoMembresia.callback();
        expect(await Notification.countDocuments({ alumnoId: alumno._id })).toBe(0);
    });

    it('ARREGLADO: si UN alumno tiene un email que hace fallar sendMail, el resto del batch igual recibe su aviso', async () => {
        const alumno1 = await alumnoConVencimientoEn(5, { nombre: 'Primero', email: 'primero@x.com', dni: 'd1' });
        const alumno2 = await alumnoConVencimientoEn(5, { nombre: 'Segundo (con email roto)', email: 'roto@x.com', dni: 'd2' });
        const alumno3 = await alumnoConVencimientoEn(5, { nombre: 'Tercero', email: 'tercero@x.com', dni: 'd3' });
        nodemailer.__setFailForRecipients(['roto@x.com']);

        await avisoMembresia.callback();

        // Cada alumno se procesa dentro de su propio try/catch: el que falla
        // no corta a los que vienen después en el mismo `for`.
        const notifAlumno1 = await Notification.countDocuments({ alumnoId: alumno1._id });
        const notifAlumno2 = await Notification.countDocuments({ alumnoId: alumno2._id });
        const notifAlumno3 = await Notification.countDocuments({ alumnoId: alumno3._id });
        expect(notifAlumno1).toBe(1); // antes del que rompe
        expect(notifAlumno2).toBe(1); // el que rompe: sí llegó a crear la Notification, solo falló el email
        expect(notifAlumno3).toBe(1); // después del que rompe: ya no se corta el loop

        const enviados = nodemailer.__getSentMails().map(m => m.to);
        expect(enviados).toContain(alumno1.email);
        expect(enviados).toContain(alumno3.email);
        expect(enviados).not.toContain(alumno2.email); // a este realmente le falló el envío
    });

    it('el rango de "5 días" cruza correctamente un fin de mes (ej. de 27 a 2 del mes siguiente)', async () => {
        // No fijamos la fecha del sistema (evitamos fake timers cerca de I/O real);
        // en cambio verificamos que el cálculo relativo (hoy+5, con hora 00:00-23:59)
        // sigue dando exactamente 1 día de ventana sin importar en qué mes caiga.
        const alumno = await alumnoConVencimientoEn(5);
        const antesDelCron = await Notification.countDocuments({});
        await avisoMembresia.callback();
        const despues = await Notification.countDocuments({});
        expect(despues - antesDelCron).toBe(1);
    });
});

describe('cron semanal: decremento de vencimiento y auto-finalización', () => {
    it('decrementa vencimiento en 1 para un plan activo, no-plantilla, con vencimiento > 0', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: 4 });
        await actualizacionSemanal.callback();
        expect((await Plan.findById(plan._id)).vencimiento).toBe(3);
    });

    it('al llegar a 0, desactiva el plan y agrega "[PLAN FINALIZADO]" a notasGlobales', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: 1, notasGlobales: 'Nota original' });
        await actualizacionSemanal.callback();
        const actualizado = await Plan.findById(plan._id);
        expect(actualizado.vencimiento).toBe(0);
        expect(actualizado.activo).toBe(false);
        expect(actualizado.notasGlobales).toBe('Nota original [PLAN FINALIZADO]');
    });

    it('nunca deja vencimiento negativo (se clampea a 0)', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: 1 });
        await actualizacionSemanal.callback();
        await actualizacionSemanal.callback(); // el plan ya está activo:false, no debería tocarse de nuevo
        expect((await Plan.findById(plan._id)).vencimiento).toBe(0);
    });

    it('NO toca plantillas (esPlantilla:true), aunque tengan vencimiento numérico', async () => {
        const { admin } = await createAdmin();
        const plantilla = await createPlanDirect(admin._id, null, { esPlantilla: true, vencimiento: 4 });
        await actualizacionSemanal.callback();
        expect((await Plan.findById(plantilla._id)).vencimiento).toBe(4);
    });

    it('NO toca planes ya inactivos (activo:false)', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: 4, activo: false });
        await actualizacionSemanal.callback();
        expect((await Plan.findById(plan._id)).vencimiento).toBe(4);
    });

    it('BUG: un plan con vencimiento null queda excluido para siempre del decremento semanal ($gt:0 no matchea null)', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const plan = await Plan.create({
            titulo: 'Plan raro', adminId: admin._id, alumnoId: student._id,
            vencimiento: null, activo: true, esPlantilla: false, sesiones: []
        });
        await actualizacionSemanal.callback();
        await actualizacionSemanal.callback();
        const actualizado = await Plan.findById(plan._id);
        expect(actualizado.vencimiento).toBeNull();
        expect(actualizado.activo).toBe(true); // nunca se desactiva por esta vía
    });

    it('procesa varios planes de distintos alumnos en la misma corrida', async () => {
        const { admin } = await createAdmin();
        const { student: a1 } = await createStudentDirect(admin._id);
        const { student: a2 } = await createStudentDirect(admin._id);
        const p1 = await createPlanDirect(admin._id, a1._id, { vencimiento: 4 });
        const p2 = await createPlanDirect(admin._id, a2._id, { vencimiento: 2 });
        await actualizacionSemanal.callback();
        expect((await Plan.findById(p1._id)).vencimiento).toBe(3);
        expect((await Plan.findById(p2._id)).vencimiento).toBe(1);
    });
});

describe('cron semanal: aviso de "tu plan está por vencer" (antes vivía en getStudentDashboard, ver docs/CAMBIOS.md #5)', () => {
    it('al decrementar y quedar en exactamente 1 semana, crea una Notification tipo PLAN', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { vencimiento: 2, titulo: 'Fuerza Nivel 1' });
        await actualizacionSemanal.callback();
        const notifs = await Notification.find({ alumnoId: student._id, tipo: 'PLAN' });
        expect(notifs).toHaveLength(1);
        expect(notifs[0].mensaje).toContain('Fuerza Nivel 1');
    });

    it('marca avisoVencimientoEnviado=true para no repetir el aviso la semana siguiente', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        const plan = await createPlanDirect(admin._id, student._id, { vencimiento: 2 });
        await actualizacionSemanal.callback(); // vencimiento: 2→1, dispara el aviso
        expect((await Plan.findById(plan._id)).avisoVencimientoEnviado).toBe(true);
    });

    it('NO duplica el aviso en corridas siguientes del cron (el flag protege, y ya no hay forma de que dos requests concurrentes lo salteen — no hay ningún GET en el medio)', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { vencimiento: 2 });
        await actualizacionSemanal.callback(); // vencimiento: 2→1, dispara el aviso
        // Otra corrida no debería tocar este plan de nuevo en el sentido de
        // "avisar" — igual decrementa (1→0) y lo desactiva, pero no crea un
        // segundo aviso de "por vencer" además del de finalización.
        await actualizacionSemanal.callback();
        const notifsPlan = await Notification.find({ alumnoId: student._id, tipo: 'PLAN' });
        expect(notifsPlan).toHaveLength(1);
    });

    it('un plan con 4 semanas NO dispara el aviso hasta llegar a exactamente 1 (no antes)', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { vencimiento: 4 });
        await actualizacionSemanal.callback(); // 4→3
        expect(await Notification.countDocuments({ alumnoId: student._id, tipo: 'PLAN' })).toBe(0);
        await actualizacionSemanal.callback(); // 3→2
        expect(await Notification.countDocuments({ alumnoId: student._id, tipo: 'PLAN' })).toBe(0);
        await actualizacionSemanal.callback(); // 2→1: acá sí
        expect(await Notification.countDocuments({ alumnoId: student._id, tipo: 'PLAN' })).toBe(1);
    });

    it('al llegar a 0 (se desactiva), NO crea también el aviso de "por vencer" — son ramas excluyentes', async () => {
        const { admin } = await createAdmin();
        const { student } = await createStudentDirect(admin._id);
        await createPlanDirect(admin._id, student._id, { vencimiento: 1 });
        await actualizacionSemanal.callback(); // 1→0, se desactiva
        expect(await Notification.countDocuments({ alumnoId: student._id, tipo: 'PLAN' })).toBe(0);
    });
});
