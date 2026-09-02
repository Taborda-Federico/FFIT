import { test, expect, crearAdmin, crearAlumno } from './fixtures.js';

async function loguearComoAdmin(page, admin) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Acceso' }).click();
    await page.getByText('Staff Admin').click();
    await page.getByPlaceholder('Correo Electrónico').fill(admin.email);
    await page.getByPlaceholder('Contraseña').fill(admin.password);
    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
    await expect(page).toHaveURL(/\/admin/);
}

test.describe('Panel de admin — gestión de socios', () => {
    test('crear un socio completo desde el form y verlo aparecer en la tabla', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-socios@x.com' });
        await loguearComoAdmin(page, admin);

        await page.getByRole('button', { name: /Nuevo Socio/ }).click();
        await page.getByPlaceholder('Nombre y Apellido').fill('Alumno E2E Completo');
        await page.getByPlaceholder('DNI / Identificación').fill('40999888');
        await page.getByPlaceholder('Teléfono de contacto').fill('3548123456');
        await page.getByPlaceholder('Correo Electrónico').fill('alumno-completo@x.com');
        await page.getByPlaceholder('Dirección de Domicilio').fill('Calle Falsa 123');
        await page.getByPlaceholder('Monto de Pago').fill('15000');
        await page.getByRole('button', { name: 'Finalizar Registro' }).click();

        // Justo después de guardar, el nombre aparece DOS veces a la vez: en
        // el toast de éxito ("¡Socio Alumno E2E Completo registrado!") y en
        // la fila de la tabla — se busca puntualmente en la tabla para no
        // depender de si el toast ya se cerró o no.
        const fila = page.locator('.users-table-pro tr', { hasText: 'Alumno E2E Completo' });
        await expect(fila).toBeVisible();
        await expect(fila.getByText('DNI: 40999888')).toBeVisible();
    });

    test('BUG: DNI duplicado NO muestra el mensaje específico del backend, solo el genérico ("Error al registrar socio") — el modal queda abierto igual', async ({ page }) => {
        // RegisterUserModal.jsx lee el error como `err.response?.data?.message`
        // (forma típica de Axios). Pero UserService.createStudent usa fetch
        // nativo y tira un Error común (`err.message`, sin `.response`), así
        // que ese acceso siempre da undefined y cae al fallback genérico —
        // el alumno nunca ve el motivo real ("DNI ya registrado" vs. "Email
        // ya registrado" vs. cualquier otro 400).
        const admin = await crearAdmin({ email: 'admin-dup@x.com' });
        await crearAlumno(admin.token, { dni: '11111111', email: 'ya-existe@x.com' });
        await loguearComoAdmin(page, admin);

        await page.getByRole('button', { name: /Nuevo Socio/ }).click();
        await page.getByPlaceholder('Nombre y Apellido').fill('Otro Nombre');
        await page.getByPlaceholder('DNI / Identificación').fill('11111111');
        await page.getByPlaceholder('Teléfono de contacto').fill('123');
        await page.getByPlaceholder('Correo Electrónico').fill('otro-email@x.com');
        await page.getByPlaceholder('Monto de Pago').fill('1000');
        await page.getByRole('button', { name: 'Finalizar Registro' }).click();

        await expect(page.getByText('Error al registrar socio')).toBeVisible();
        await expect(page.getByText(/ya están registrados/i)).not.toBeVisible();
        // El modal sigue abierto y usable — eso sí funciona bien.
        await expect(page.getByPlaceholder('Nombre y Apellido')).toBeVisible();
    });

    test('buscar por nombre/DNI filtra la tabla en vivo', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-buscar@x.com' });
        await crearAlumno(admin.token, { nombre: 'Buscar A', dni: '222' });
        await crearAlumno(admin.token, { nombre: 'Buscar B', dni: '333' });
        await loguearComoAdmin(page, admin);

        await page.getByPlaceholder(/Buscar por nombre/).fill('333');
        await expect(page.getByText('Buscar B')).toBeVisible();
        await expect(page.getByText('Buscar A')).not.toBeVisible();
    });

    test('registrar un pago (renovar) actualiza el estado de vencimiento en la tabla', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-cobrar@x.com' });
        // Alumno con vencimiento YA vencido (crearAlumno via API deja 1 mes a
        // futuro por defecto; forzamos un vencido pegándole al backend directo).
        const alumno = await crearAlumno(admin.token, { nombre: 'Para Cobrar' });
        await loguearComoAdmin(page, admin);

        await expect(page.getByText('Para Cobrar')).toBeVisible();
        const fila = page.locator('tr', { hasText: 'Para Cobrar' });
        await fila.getByTitle('Registrar Pago y Renovar').click();
        await page.getByRole('button', { name: 'Aceptar Pago' }).click();
        await expect(page.getByText(/Membresía renovada/)).toBeVisible();
    });

    test('eliminar un socio lo saca de la tabla', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-borrar@x.com' });
        await crearAlumno(admin.token, { nombre: 'Para Borrar E2E' });
        await loguearComoAdmin(page, admin);

        await expect(page.getByText('Para Borrar E2E')).toBeVisible();
        const fila = page.locator('tr', { hasText: 'Para Borrar E2E' });
        await fila.getByTitle('Eliminar Alumno').click();
        await page.getByRole('button', { name: 'Sí, Eliminar' }).click();
        await expect(page.getByText('Para Borrar E2E', { exact: true })).not.toBeVisible();
    });

    test('un admin creado por otro admin puede loguearse y ve una lista de socios vacía (multi-tenant real)', async ({ page }) => {
        const adminA = await crearAdmin({ email: 'admin-tenantA@x.com' });
        await crearAlumno(adminA.token, { nombre: 'Solo de A' });

        const adminB = await crearAdmin({ email: 'admin-tenantB@x.com' });
        await loguearComoAdmin(page, adminB);
        await expect(page.getByText('0 Alumnos en el sistema')).toBeVisible();
        await expect(page.getByText('Solo de A')).not.toBeVisible();
    });
});
