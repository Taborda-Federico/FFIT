import { test, expect, crearAdmin, crearAlumno, publicarPlan, loguearComoAlumno } from './fixtures.js';

async function loguearComoAdmin(page, admin) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Acceso' }).click();
    await page.getByText('Staff Admin').click();
    await page.getByPlaceholder('Correo Electrónico').fill(admin.email);
    await page.getByPlaceholder('Contraseña').fill(admin.password);
    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
    await expect(page).toHaveURL(/\/admin/);
}

// Pedido explícito del cliente (ver docs/CAMBIOS.md): antes se guardaba un
// solo peso por ejercicio para TODA la sesión. Este test recorre la
// cadena completa, en un navegador real: el alumno entrena una sesión
// cargando pesos DISTINTOS serie a serie, con sus repeticiones, y el admin
// después ve esa variación reflejada en su curva de sobrecarga progresiva.
test.describe('Peso por serie — de punta a punta (alumno entrena, admin hace seguimiento)', () => {
    test('el alumno carga pesos distintos por serie, y el admin los ve reflejados en "Mejor serie" y "Volumen total"', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-series@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Series' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Series',
            sesiones: [{
                nombre: 'Día 1',
                bloques: [{ tipo: 'standard', descanso: 1, ejercicios: [{ nombre: 'Press de Banca', series: 3, reps: '8-10' }] }]
            }],
        });

        // --- El alumno entrena, con peso variable serie a serie ---
        await loguearComoAlumno(page, alumno);
        await page.locator('.hub-session-card', { hasText: 'Día 1' }).click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();

        await page.getByLabel(/Peso serie 1/).fill('40');
        await page.getByLabel(/Repeticiones serie 1/).fill('10');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();

        await page.getByLabel(/Peso serie 2/).fill('45');
        await page.getByLabel(/Repeticiones serie 2/).fill('6');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();

        await page.getByLabel(/Peso serie 3/).fill('42');
        await page.getByLabel(/Repeticiones serie 3/).fill('8');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();

        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();
        await expect(page.getByText('LOGBOOK PERSONAL')).toBeVisible();

        // --- El alumno revisa su propio historial: ve el desglose real ---
        await page.getByText('Día 1').first().click();
        await expect(page.getByText('Mejor: 45kg')).toBeVisible();
        await expect(page.getByText(/S1.*40.*×.*10/)).toBeVisible();
        await expect(page.getByText(/S2.*45.*×.*6/)).toBeVisible();
        await expect(page.getByText(/S3.*42.*×.*8/)).toBeVisible();

        // --- El admin entra a Seguimiento y ve la curva de este alumno ---
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/progreso');
        await page.getByPlaceholder(/Escribe nombre o DNI/).fill('Alumno Series');
        await page.getByText('Alumno Series').click();

        // Por defecto, "Mejor serie": el máximo de [40, 45, 42] es 45.
        const cajaMetrica = page.locator('.metric-box-pro').first();
        await expect(cajaMetrica).toContainText('45 kg');

        // Cambiando a "Volumen total": 40×10 + 45×6 + 42×8 = 400+270+336 = 1006.
        await page.getByRole('button', { name: 'Volumen total' }).click();
        await expect(cajaMetrica).toContainText('1006 kg');
        await expect(cajaMetrica).toContainText('MEJOR VOLUMEN');
    });
});
