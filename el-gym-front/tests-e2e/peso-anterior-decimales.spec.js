import { test, expect, crearAdmin, crearAlumno, publicarPlan, loguearComoAlumno } from './fixtures.js';

// Dos arreglos pedidos por el cliente, probados juntos en un navegador real:
//  1. "Ant:" (el peso de la vez anterior) siempre decía 0 — ahora sale del
//     historial real del alumno.
//  2. Se pueden cargar pesos con coma o decimales (42,5).
test.describe('Peso anterior real + pesos con coma/decimales', () => {
    test('un peso cargado con coma en un entrenamiento aparece como "Ant:" al hacer el mismo ejercicio en otra sesión', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-pesoant@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Peso Anterior' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Peso Anterior',
            sesiones: [
                { nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Sentadilla', series: 1, reps: '10' }] }] },
                { nombre: 'Día 2', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Sentadilla', series: 1, reps: '10' }] }] },
            ],
        });
        await loguearComoAlumno(page, alumno);

        // Primera vez: nunca lo hizo, no hay nada que mostrar (antes decía "0kg").
        await page.locator('.hub-session-card', { hasText: 'Día 1' }).click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();
        await expect(page.getByText('Ant: —')).toBeVisible();

        // Carga un peso con COMA.
        await page.getByLabel(/Peso serie 1/).fill('42,5');
        await expect(page.getByLabel(/Peso serie 1/)).toHaveValue('42,5');
        await page.getByLabel(/Repeticiones serie 1/).fill('10');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();
        await expect(page.getByText('S1 · 42,5kg × 10')).toBeVisible();
        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();
        await expect(page.getByText('LOGBOOK PERSONAL')).toBeVisible();

        // El decimal se guardó bien (no se perdió ni se redondeó): se ve en el historial.
        await page.getByText('Día 1').click();
        await expect(page.getByText('Mejor: 42,5kg')).toBeVisible();
        await page.locator('.btn-close-detail').click();

        // Segunda sesión con el MISMO ejercicio: ahora "Ant:" muestra lo que levantó.
        await page.getByText('Inicio').click();
        await page.locator('.hub-session-card', { hasText: 'Día 2' }).click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();
        await expect(page.getByText('Ant: 42,5kg')).toBeVisible();
    });
});
