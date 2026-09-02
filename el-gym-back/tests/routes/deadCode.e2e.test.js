// Este archivo documentaba código muerto/huérfano encontrado en la auditoría
// (ver docs/CAMBIOS.md #3): rutas que el frontend creía que existían, y una
// función de controller rota que nunca se conectó a ninguna ruta. Ese código
// ya se borró del lado del frontend y del backend — lo que queda acá son
// chequeos genéricos de que el servidor sigue respondiendo bien (404 limpio,
// sin explotar) ante rutas que nunca existieron.
const request = require('supertest');
const app = require('../../src/app');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Rutas que nunca existieron en el backend (antes las llamaba el-gym-front/src/service/gym.service.js, ya borrado)', () => {
    // gym.service.js (y su apiFetch de api.config.js) le pegaban a rutas
    // como /api/pagos, /api/stats, /api/attendance, /api/exercises,
    // /api/templates, etc. Ese archivo solo lo consumía AdminFinanceDashboard.jsx,
    // que App.jsx nunca llegó a renderizar (la ruta /admin/finanzas usaba un
    // <div>Finanzas</div> hardcodeado) — los tres archivos se borraron por
    // completo (ver docs/CAMBIOS.md #3). Estos checks quedan como un control
    // genérico de que rutas inexistentes dan 404 limpio, no un 500.
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

    it.each(rutasFantasma)('%s %s no existe (404)', async (metodo, ruta) => {
        const { token } = await createAdmin();
        const res = await request(app)[metodo](ruta).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});

describe('studentController ya no tiene la función rota getStudentProgressForAdmin', () => {
    // Existía una segunda copia (rota: usaba AdminNote sin importarlo) de lo
    // que ya hace bien adminController.getStudentProgress, conectada a
    // /api/admin/student-progress/:id. Se borró la copia muerta en vez de
    // arreglarla, para no dejar dos formas de hacer lo mismo en el código.
    it('studentRoutes.js sigue teniendo exactamente las 6 rutas reales, ninguna extra', () => {
        const studentRoutes = require('../../src/routes/studentRoutes');
        const stack = studentRoutes.stack.map(l => l.route && l.route.path).filter(Boolean);
        expect(stack).toEqual(['/dashboard', '/workout', '/history', '/notifications', '/notifications/:id/read', '/change-password']);
    });

    it('el controller ya no exporta getStudentProgressForAdmin', () => {
        const exportado = require('../../src/controllers/studentController');
        expect(exportado.getStudentProgressForAdmin).toBeUndefined();
        expect(Object.keys(exportado).sort()).toEqual(
            ['changePassword', 'getMyHistory', 'getMyNotifications', 'getStudentDashboard', 'markNotificationRead', 'saveWorkoutLog']
        );
    });
});

describe('El backend nunca tuvo (ni tiene) un endpoint tipo "god mode"', () => {
    // AdminRegister.jsx (frontend, ya borrado) escribía un localStorage con
    // role: 'GOD_MODE' sin llamar a ningún endpoint — un backdoor puramente
    // client-side. Confirmamos que del lado del servidor nunca existió nada
    // parecido.
    it('no existe ninguna ruta relacionada con "god mode" o un registro sin verificación real', async () => {
        const res = await request(app).post('/api/auth/god-mode').send({});
        expect(res.status).toBe(404);
    });
});
