import { test, expect, crearAdmin, crearAlumno } from './fixtures.js';

// El selector de login (Staff Admin / Alumno) vive dentro de un modal que
// solo aparece al hacer click en "Acceso" del navbar — no está en la home
// por defecto.
async function abrirLogin(page) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Acceso' }).click();
}

test.describe('Login — flujo real en navegador', () => {
    test('un admin se loguea y llega al panel', async ({ page }) => {
        await crearAdmin({ email: 'admin-e2e@x.com', password: 'secret123' });
        await abrirLogin(page);
        await page.getByText('Staff Admin').click();
        await page.getByPlaceholder('Correo Electrónico').fill('admin-e2e@x.com');
        await page.getByPlaceholder('Contraseña').fill('secret123');
        await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
        await expect(page).toHaveURL(/\/admin/);
    });

    test('contraseña incorrecta muestra el error y no navega', async ({ page }) => {
        await crearAdmin({ email: 'admin-e2e-2@x.com', password: 'secret123' });
        await abrirLogin(page);
        await page.getByText('Staff Admin').click();
        await page.getByPlaceholder('Correo Electrónico').fill('admin-e2e-2@x.com');
        await page.getByPlaceholder('Contraseña').fill('mala');
        await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
        await expect(page.getByText(/incorrectos/i)).toBeVisible();
        await expect(page).toHaveURL('/');
    });

    test('un alumno logueándose desde el portal "Staff Admin" es rechazado por el frontend (aunque sus credenciales sean válidas)', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-e2e-3@x.com' });
        const alumno = await crearAlumno(admin.token, { email: 'alumno-e2e@x.com' });
        await abrirLogin(page);
        await page.getByText('Staff Admin').click();
        await page.getByPlaceholder('Correo Electrónico').fill('alumno-e2e@x.com');
        await page.getByPlaceholder('Contraseña').fill(alumno.dni); // password inicial = dni
        await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
        await expect(page.getByText(/no tiene permisos de admin/i)).toBeVisible();
    });

    test('un alumno se loguea desde el portal correcto y llega a /user', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-e2e-4@x.com' });
        const alumno = await crearAlumno(admin.token, { email: 'alumno-e2e-2@x.com' });
        await abrirLogin(page);
        await page.getByRole('heading', { name: 'Alumno' }).click();
        await page.getByPlaceholder('Correo Electrónico').fill('alumno-e2e-2@x.com');
        await page.getByPlaceholder('Contraseña').fill(alumno.dni);
        await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
        await expect(page).toHaveURL(/\/user/);
    });

    test('sin sesión, ir directo a /admin redirige a la home pública', async ({ page }) => {
        await page.goto('/admin');
        await expect(page).toHaveURL('/');
    });

    test('sin sesión, ir directo a /user redirige a la home pública', async ({ page }) => {
        await page.goto('/user');
        await expect(page).toHaveURL('/');
    });

    test('una ruta que no existe muestra la página 404', async ({ page }) => {
        await page.goto('/esto-no-existe-en-ningun-lado');
        await expect(page.getByText('404')).toBeVisible();
    });
});
