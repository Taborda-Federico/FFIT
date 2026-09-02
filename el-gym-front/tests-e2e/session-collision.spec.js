import { test, expect, crearAdmin, crearAlumno, publicarPlan, loguearComoAlumno } from './fixtures.js';

// Reproduce EN UN NAVEGADOR REAL (backend e2e real, Mongo real) el bug de
// colisión de nombres de sesión: nada, ni en el builder ni en el backend,
// impide que dos sesiones del mismo plan queden con el mismo `nombre` (un
// admin copia una sesión y se olvida de renombrarla, por ejemplo). Antes,
// el matching de "sesión completada" en HomeHub comparaba solo por texto,
// así que entrenar una marcaba a las DOS como hechas. Ahora el frontend
// manda el _id real de la sesión (`sesionId`) al guardar el entrenamiento,
// y HomeHub matchea por ahí — ver docs/CAMBIOS.md.
test.describe('Colisión de nombres de sesión duplicados', () => {
    test('ARREGLADO: completar UNA de dos sesiones con el mismo nombre ya no marca también a la otra como completada', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-colision@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Colision' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan con nombres repetidos',
            sesiones: [
                { nombre: 'Día 3', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Sentadilla', series: 1, reps: '10' }] }] },
                { nombre: 'Día 3', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Press', series: 1, reps: '10' }] }] },
            ],
        });
        await loguearComoAlumno(page, alumno);

        const tarjetas = page.locator('.hub-session-card', { hasText: 'Día 3' });
        await expect(tarjetas).toHaveCount(2);

        // Entrena la PRIMERA de las dos.
        await tarjetas.first().click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();
        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();

        await page.getByText('Inicio').click();
        const tarjetasDespues = page.locator('.hub-session-card', { hasText: 'Día 3' });
        await expect(tarjetasDespues.first()).toContainText('COMPLETADA');

        // La SEGUNDA sesión (mismo nombre, _id distinto) NO quedó marcada
        // como completada. Sigue bloqueada, pero por el motivo correcto:
        // "ya entrenaste hoy" (yaEntrenoHoy), un mecanismo aparte que no
        // depende de qué sesión puntual se haya entrenado.
        await expect(tarjetasDespues.nth(1)).not.toContainText('COMPLETADA');
        await expect(tarjetasDespues.nth(1)).toContainText('ESPERA A MAÑANA');
    });
});
