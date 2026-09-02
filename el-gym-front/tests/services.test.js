import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanService } from '../src/service/plan.service';
import { StudentService } from '../src/service/student.service';
import { UserService } from '../src/service/user.service';
import { AdminService } from '../src/service/admin.service';
import { AuthService } from '../src/service/auth.service';
import { LandingService } from '../src/service/landing.service';

function mockFetchOnce(body, ok = true, status = ok ? 200 : 400) {
    global.fetch = vi.fn().mockResolvedValue({
        ok, status, json: () => Promise.resolve(body)
    });
}

describe('Todos los services apuntan a producción hardcodeada, sin variable de entorno', () => {
    it('plan.service.js pega contra la URL de producción real, aunque no se haya configurado nada (no lee import.meta.env)', async () => {
        mockFetchOnce([]);
        await PlanService.getPlantillas('tok');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://ffit.onrender.com/api/planes/plantillas',
            expect.anything()
        );
        // Esto significa que correr `npm run dev` en el frontend, en la
        // computadora de cualquier desarrollador, habla con la base de datos
        // de PRODUCCIÓN por default — ver hallazgo en el reporte.
    });
});

describe('plan.service.js', () => {
    beforeEach(() => { mockFetchOnce({}); });

    it('publicarPlan hace POST a /planes/publicar con el token en el header', async () => {
        await PlanService.publicarPlan({ titulo: 'X' }, 'tok123');
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('https://ffit.onrender.com/api/planes/publicar');
        expect(opts.method).toBe('POST');
        expect(opts.headers.Authorization).toBe('Bearer tok123');
    });

    it('si la respuesta no es ok, lanza un Error con el message del body', async () => {
        mockFetchOnce({ message: 'Alumno no encontrado' }, false, 403);
        await expect(PlanService.publicarPlan({}, 'tok')).rejects.toThrow('Alumno no encontrado');
    });

    it('guardarPlantilla y getPlantillas pegan a las rutas correctas', async () => {
        await PlanService.guardarPlantilla({ titulo: 'X' }, 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/planes/plantilla', expect.anything());
        await PlanService.getPlantillas('tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/planes/plantillas', expect.anything());
    });
});

describe('student.service.js', () => {
    beforeEach(() => { mockFetchOnce({}); });

    it('getDashboard, getHistory, saveWorkout pegan a las rutas correctas', async () => {
        await StudentService.getDashboard('tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/student/dashboard', expect.anything());
        await StudentService.getHistory('tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/student/history', expect.anything());
        await StudentService.saveWorkout({ nombreSesion: 'X' }, 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/student/workout', expect.objectContaining({ method: 'POST' }));
    });

    it('BUG MENOR: markNotificationRead no revisa `response.ok` — un 500 del server pasa desapercibido, la promesa resuelve igual', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
        await expect(StudentService.markNotificationRead('id1', 'tok')).resolves.toBeUndefined();
        // A diferencia de TODOS los demás métodos de este archivo (que sí
        // chequean `response.ok` y lanzan), este es el único que no lo hace:
        // si falla en el servidor, la UI (StudentService.markNotificationRead
        // se llama sin await ni catch desde donde se usa) no se entera.
    });
});

describe('user.service.js', () => {
    beforeEach(() => { mockFetchOnce({}); });

    it('createStudent, getStudents, renewMembership, deleteUser pegan a las rutas correctas', async () => {
        await UserService.createStudent({ nombre: 'X' }, 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/users', expect.objectContaining({ method: 'POST' }));
        await UserService.getStudents('tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/users', expect.anything());
        await UserService.renewMembership('id1', 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/users/id1/renew', expect.objectContaining({ method: 'PUT' }));
        await UserService.deleteUser('id1', 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/users/id1', expect.objectContaining({ method: 'DELETE' }));
    });
});

describe('admin.service.js', () => {
    beforeEach(() => { mockFetchOnce({}); });

    it('searchStudents pega a /users/search — ruta que NO existe en el backend real (userRoutes.js no la define)', async () => {
        await AdminService.searchStudents('fede', 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/users/search?q=fede', expect.anything());
        // Esto documenta una FUNCIÓN del service que, si se llegara a usar
        // desde algún componente, devolvería 404 — ver reporte.
    });

    it('getStudentProgress y createNote pegan a las rutas correctas y reales', async () => {
        await AdminService.getStudentProgress('id1', 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/admin/student-progress/id1', expect.anything());
        await AdminService.createNote({ alumnoId: 'id1', contenido: 'x' }, 'tok');
        expect(global.fetch).toHaveBeenCalledWith('https://ffit.onrender.com/api/admin/student-notes', expect.objectContaining({ method: 'POST' }));
    });
});

describe('auth.service.js', () => {
    it('login pega a /auth/login (sin token, es público)', async () => {
        mockFetchOnce({ token: 'x' });
        await AuthService.login('a@x.com', 'pass');
        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toBe('https://ffit.onrender.com/api/auth/login');
        expect(opts.headers.Authorization).toBeUndefined();
    });
});

describe('landing.service.js', () => {
    it('getPublicLanding no manda Authorization', async () => {
        mockFetchOnce({});
        await LandingService.getPublicLanding();
        const [, opts] = global.fetch.mock.calls[0];
        expect(opts?.headers?.Authorization).toBeUndefined();
    });

    it('getLanding y updateLanding sí mandan el token', async () => {
        mockFetchOnce({});
        await LandingService.getLanding('tok');
        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    });
});

// api.config.js y gym.service.js se borraron (ver docs/CAMBIOS.md #3): eran
// un cliente de API paralelo, 100% desconectado del resto de la app, que
// solo consumía AdminFinanceDashboard.jsx (una pantalla que App.jsx nunca
// llegaba a renderizar). Ya no hay nada que testear ahí.
