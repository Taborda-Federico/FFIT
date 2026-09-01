import { test, expect, crearAdmin, crearAlumno, publicarPlan, loguearComoAlumno } from './fixtures.js';

test.describe('Flujo del alumno — ver plan, entrenar, ver historial', () => {
    test('el alumno ve el plan asignado en su Inicio, con el nombre de la sesión y la cantidad de bloques', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-flujo1@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Flujo' });
        await publicarPlan(admin.token, alumno._id, { titulo: 'Mi Plan de Fuerza' });

        await loguearComoAlumno(page, alumno);
        // "Mi Plan de Fuerza" aparece dos veces a la vez (el indicador junto
        // al selector de plantillas y, más abajo, dentro de la tarjeta de la
        // sesión) — con .first() alcanza para confirmar que está presente.
        await expect(page.getByText('Mi Plan de Fuerza').first()).toBeVisible();
        await expect(page.getByText('Día 1')).toBeVisible();
        await expect(page.getByText('1 Bloques')).toBeVisible();
    });

    test('sin plan asignado, muestra el estado vacío en vez de una pantalla en blanco', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-flujo2@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Sin Plan' });
        await loguearComoAlumno(page, alumno);
        await expect(page.getByText(/no tienes ninguna rutina asignada/i)).toBeVisible();
    });

    test('completar un entrenamiento de punta a punta: entra, carga peso, finaliza, y aparece en el Historial', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-flujo3@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Entrena' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Entrenable',
            sesiones: [{ nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Sentadilla', series: 1, reps: '10' }] }] }],
        });
        await loguearComoAlumno(page, alumno);

        await page.locator('.hub-session-card', { hasText: 'Día 1' }).click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();
        await page.getByPlaceholder('0').fill('42');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();
        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();

        // Al terminar, navega solo a la pestaña Historial.
        await expect(page.getByText('LOGBOOK PERSONAL')).toBeVisible();
        await expect(page.getByText('Día 1')).toBeVisible();
        await expect(page.getByText('42 kg')).toBeVisible();
    });

    test('después de entrenar hoy, TODAS las demás sesiones quedan bloqueadas ("ESPERA A MAÑANA")', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-flujo4@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Bloqueo' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Dos Días',
            sesiones: [
                { nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'A', series: 1, reps: '5' }] }] },
                { nombre: 'Día 2', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'B', series: 1, reps: '5' }] }] },
            ],
        });
        await loguearComoAlumno(page, alumno);

        await page.locator('.hub-session-card', { hasText: 'Día 1' }).click();
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();
        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();

        await page.getByText('Inicio').click();
        await expect(page.locator('.hub-session-card', { hasText: 'Día 2' })).toContainText('ESPERA A MAÑANA');
    });

    test('cambiar la contraseña desde el Perfil permite loguearse con la nueva', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-flujo5@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Pass' });
        await loguearComoAlumno(page, alumno);

        await page.getByText('Perfil').click();
        await page.getByText('Configurar Contraseña').click();
        await page.getByPlaceholder(/Contraseña Actual/).fill(alumno.dni);
        await page.getByPlaceholder('Nueva Contraseña', { exact: true }).fill('nuevaClaveSegura123');
        await page.getByPlaceholder('Repetir Nueva Contraseña').fill('nuevaClaveSegura123');
        await page.getByRole('button', { name: 'Guardar Cambios' }).click();
        await expect(page.getByText(/actualizada con éxito/)).toBeVisible();

        await page.getByText('CERRAR SESIÓN').click();
        await page.getByRole('button', { name: 'Acceso' }).click();
        await page.getByRole('heading', { name: 'Alumno' }).click();
        await page.getByPlaceholder('Correo Electrónico').fill(alumno.email);
        await page.getByPlaceholder('Contraseña').fill('nuevaClaveSegura123');
        await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
        await expect(page).toHaveURL(/\/user/);
    });
});
