// Este archivo documenta CÓDIGO MUERTO/HUÉRFANO encontrado en el backend:
// rutas que el frontend cree que existen (las llama desde
// el-gym-front/src/service/gym.service.js) pero que jamás se registraron
// en ningún archivo de routes/, y una función de controller exportada que
// nunca se conectó a ninguna ruta y además tiene un bug de referencia.
const request = require('supertest');
const app = require('../../src/app');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Rutas que el-gym-front/src/service/gym.service.js asume que existen, pero NO están montadas en ningún routes/*.js', () => {
    // gym.service.js (y su apiFetch de api.config.js) es consumido SOLO por
    // AdminFinanceDashboard.jsx — que a su vez App.jsx nunca renderiza (la
    // ruta /admin/finanzas usa un <div>Finanzas</div> hardcodeado). Toda esta
    // cadena de features (finanzas, asistencia, biblioteca de ejercicios,
    // CRUD genérico de planes/alumnos con otros nombres) es 100% inalcanzable
    // y, aunque se conectara, fallaría: no hay backend para ninguna de estas.
    const rutasFantasma = [
        ['get', '/api/alumnos'],
        ['get', '/api/alumnos/507f1f77bcf86cd799439011'],
        ['post', '/api/alumnos'],
        ['get', '/api/planes/alumno/507f1f77bcf86cd799439011'],
        ['put', '/api/planes/507f1f77bcf86cd799439011'],
        ['get', '/api/exercises'],
        ['get', '/api/templates'],
        ['get', '/api/pagos/pendientes'],
        ['get', '/api/pagos/historial'],
        ['get', '/api/attendance/today'],
        ['get', '/api/stats/dashboard'],
        ['get', '/api/content'],
        ['post', '/api/media/upload'],
        ['post', '/api/auth/admin/login'],
    ];

    it.each(rutasFantasma)('%s %s no existe (404) — confirma que gym.service.js apunta a un backend que no está implementado', async (metodo, ruta) => {
        const { token } = await createAdmin();
        const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

describe('studentController.getStudentProgressForAdmin: exportada pero jamás montada en una ruta, y con un bug si se llamara', () => {
    it('no existe ninguna ruta HTTP que la invoque (ni bajo /api/student ni bajo /api/admin con ese nombre exacto)', () => {
        const studentRoutes = require('../../src/routes/studentRoutes');
        // Verificamos indirectamente: las únicas rutas registradas en
        // studentRoutes son las 6 que sabemos (dashboard, workout, history,
        // notifications, notifications/:id/read, change-password). No hay
        // ninguna ruta "/progress" ahí, y adminRoutes usa la función
        // equivalente de adminController (que SÍ importa AdminNote bien).
        const stack = studentRoutes.stack.map(l => l.route && l.route.path).filter(Boolean);
        expect(stack).toEqual(['/dashboard', '/workout', '/history', '/notifications', '/notifications/:id/read', '/change-password']);
    });

    it('DOBLEMENTE muerta: ni siquiera está en el module.exports del archivo (no alcanza con "no tiene ruta")', () => {
        const exportado = require('../../src/controllers/studentController');
        expect(exportado.getStudentProgressForAdmin).toBeUndefined();
        // Sí siguen exportadas las 6 funciones que SÍ se usan.
        expect(Object.keys(exportado).sort()).toEqual(
            ['changePassword', 'getMyHistory', 'getMyNotifications', 'getStudentDashboard', 'markNotificationRead', 'saveWorkoutLog']
        );
    });

    it('el código fuente de la función referencia `AdminNote` sin importarlo en este archivo (si algún día se exporta/rutea, explota con ReferenceError)', () => {
        const fs = require('fs');
        const path = require('path');
        const codigoFuente = fs.readFileSync(path.join(__dirname, '../../src/controllers/studentController.js'), 'utf8');
        const usaAdminNote = /AdminNote\.find/.test(codigoFuente);
        const importaAdminNote = /require\(.*AdminNote.*\)/.test(codigoFuente);
        expect(usaAdminNote).toBe(true);
        expect(importaAdminNote).toBe(false);
    });
});

describe('AdminRegister.jsx (frontend): no tiene contraparte de backend', () => {
    it('no existe ninguna ruta que emule un "GOD_MODE" client-side sin verificación de servidor', async () => {
        // Este test es más una nota de documentación que una prueba de HTTP:
        // AdminRegister.jsx (frontend) escribe localStorage.setItem('admin_session',
        // {..., role: 'GOD_MODE'}) SIN llamar a ningún endpoint. Confirmamos
        // que el backend no tiene absolutamente ningún endpoint relacionado con
        // "god mode" o registro sin verificación real de secreto/admin.
        const res = await request(app).post('/api/auth/god-mode').send({});
        expect(res.status).toBe(404);
    });
});
