// tests-e2e/fixtures.js
//
// Extiende el `test` de Playwright para que, en cada página, cualquier
// request a la URL de producción hardcodeada (https://ffit.onrender.com/api/*)
// se reenvíe al backend e2e local (ver playwright.config.js). El fetch real
// se hace acá, en el proceso de Node de Playwright — nunca en el browser —
// así que no hay problema de CORS.
import base from '@playwright/test';

const BACKEND_URL = `http://localhost:${process.env.E2E_PORT || 5057}`;

async function interceptar(page) {
    await page.route('https://ffit.onrender.com/api/**', async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const destino = BACKEND_URL + url.pathname + url.search;
        const headers = await req.allHeaders();
        delete headers['host'];

        try {
            const res = await fetch(destino, {
                method: req.method(),
                headers,
                body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData(),
            });
            const body = await res.text();
            const resHeaders = {};
            res.headers.forEach((v, k) => { resHeaders[k] = v; });
            await route.fulfill({ status: res.status, headers: resHeaders, body });
        } catch (err) {
            await route.fulfill({ status: 500, body: JSON.stringify({ message: 'e2e proxy error: ' + err.message }) });
        }
    });
}

export const test = base.test.extend({
    page: async ({ page }, use) => {
        await interceptar(page);
        // Arranca cada test con la base limpia.
        await fetch(BACKEND_URL + '/__test__/reset', { method: 'POST' });
        await use(page);
    },
});

export const expect = base.expect;

// --- Helpers de seed vía la API real (no tocan Mongo directo) ---
export async function crearAdmin({ nombre = 'Profe Test', email, password = 'password123' } = {}) {
    email = email || `admin${Date.now()}${Math.random().toString(36).slice(2)}@x.com`;
    const res = await fetch(BACKEND_URL + '/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, adminSecret: 'e2e-admin-secret' }),
    });
    const data = await res.json();
    return { ...data, email, password };
}

export async function crearAlumno(token, overrides = {}) {
    const dni = overrides.dni || String(Date.now()).slice(-8);
    const email = overrides.email || `alumno${Date.now()}${Math.random().toString(36).slice(2)}@x.com`;
    const res = await fetch(BACKEND_URL + '/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            nombre: overrides.nombre || 'Alumno Test', dni, email,
            telefono: overrides.telefono || '1122334455', peso: '80', altura: '178',
            domicilio: 'Calle Falsa 123', montoPago: '15000', fechaInicio: new Date().toISOString().split('T')[0],
        }),
    });
    const data = await res.json();
    return { ...data, dni, email };
}

export async function publicarPlan(token, alumnoId, { titulo = 'Plan Test', sesiones } = {}) {
    const res = await fetch(BACKEND_URL + '/api/planes/publicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
            alumnoId, titulo, vencimiento: 4,
            sesiones: sesiones || [{ nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Sentadilla', series: 3, reps: '10' }] }] }],
        }),
    });
    return res.json();
}

export async function seedWorkout(alumnoId, nombreSesion, createdAt) {
    await fetch(BACKEND_URL + '/__test__/seed-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alumnoId, nombreSesion, createdAt }),
    });
}

export async function loguearComoAlumno(page, alumno) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Acceso' }).click();
    await page.getByRole('heading', { name: 'Alumno' }).click();
    await page.getByPlaceholder('Correo Electrónico').fill(alumno.email);
    await page.getByPlaceholder('Contraseña').fill(alumno.dni);
    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
    await page.waitForURL(/\/user/);
}

export { BACKEND_URL };
