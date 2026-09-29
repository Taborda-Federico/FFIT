import { test, expect, crearAdmin, crearAlumno, publicarPlan, actualizarPlan, loguearComoAlumno } from './fixtures.js';

// Sección "Planes Activos" del admin (pedido del cliente): el admin necesita
// poder editar un plan que un alumno ya tiene asignado, y el caso que más
// preocupaba era "¿y si lo edita mientras el alumno está entrenando?". Este
// test reproduce EN UN NAVEGADOR REAL (backend e2e real, Mongo real) el peor
// caso posible: el admin edita el plan (por API, simulando otra pestaña/
// dispositivo) MIENTRAS el alumno tiene una sesión activa abierta, y
// confirma que:
//   1. La sesión activa del alumno sigue funcionando y se puede terminar sin
//      errores (la edición no la corrompe ni la interrumpe).
//   2. Al terminar, el alumno ya ve el plan editado (antes se quedaba con la
//      versión vieja hasta cerrar sesión — ver UserDashboard.jsx).
//   3. Un día que YA tenía marcado como completado esta semana sigue
//      marcado así después de la edición (no pierde el progreso).
//   4. La sesión que se acaba de terminar (la que estaba activa durante la
//      edición) también queda bien marcada como completada.
//   5. Una sesión nueva agregada en la edición aparece disponible.
test.describe('Editar un plan activo — no rompe una sesión en curso', () => {
    test('editar el plan MIENTRAS el alumno entrena no interrumpe la sesión, y el resultado final es consistente', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-editplan@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Edicion' });

        const { plan } = await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Original',
            sesiones: [
                { nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Sentadilla', series: 1, reps: '10' }] }] },
                { nombre: 'Día 2', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Press', series: 1, reps: '10' }] }] },
            ],
        });
        const [dia1, dia2] = plan.sesiones;

        await loguearComoAlumno(page, alumno);

        // 1) Completa "Día 1" de punta a punta — esta es la sesión que YA
        // va a estar marcada como completada esta semana, antes de que el
        // admin toque nada.
        await page.locator('.hub-session-card', { hasText: 'Día 1' }).click();
        await page.getByLabel(/Repeticiones serie 1/).fill('10');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();
        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();
        await expect(page.getByText('LOGBOOK PERSONAL')).toBeVisible();

        // 2) Arranca "Día 2" — esta sesión queda ACTIVA (a medio hacer) en
        // el navegador del alumno.
        await page.getByText('Inicio').click();
        await page.locator('.hub-session-card', { hasText: 'Día 2' }).click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();

        // 3) El admin edita el plan AHORA MISMO, con el alumno todavía
        // adentro de "Día 2". Conserva el _id de ambas sesiones (como hace
        // el armador cuando el profe edita en el mismo lugar, no borra y
        // recrea) y agrega un "Día 3" nuevo.
        const resEdicion = await actualizarPlan(admin.token, plan._id, {
            titulo: 'Plan Editado A Mitad De Semana',
            vencimiento: plan.vencimiento,
            sesiones: [
                { ...dia1, nombre: 'Día 1 (renombrado)' },
                { ...dia2, nombre: 'Día 2 (renombrado)' },
                { nombre: 'Día 3', bloques: [{ tipo: 'standard', descanso: 5, ejercicios: [{ nombre: 'Remo', series: 1, reps: '10' }] }] },
            ],
        });
        expect(resEdicion.plan.sesiones[0]._id).toBe(dia1._id); // se conservó, no se regeneró
        expect(resEdicion.plan.sesiones[1]._id).toBe(dia2._id);

        // 4) La sesión activa del alumno NO se enteró de nada (no hay
        // websockets) — sigue funcionando exactamente igual, se puede
        // terminar sin ningún error.
        await page.getByLabel(/Repeticiones serie 1/).fill('10');
        await page.getByRole('button', { name: /FINALIZAR SERIE/ }).click();
        await page.getByRole('button', { name: /FINALIZAR ENTRENAMIENTO/ }).click();
        await expect(page.getByText('LOGBOOK PERSONAL')).toBeVisible();
        // El log se guardó con el nombre VIEJO ("Día 2"), tal cual lo tenía
        // cargado en memoria — nada de esto se pierde ni se corrompe.
        await expect(page.getByText('Día 2').first()).toBeVisible();

        // 5) Al volver a Inicio, el plan YA está editado (gracias al
        // refetch post-entrenamiento) — y las DOS sesiones que se
        // entrenaron esta semana (la de antes de la edición y la que
        // estaba activa durante la edición) siguen marcadas como
        // completadas, porque conservaron su _id real.
        await page.getByText('Inicio').click();
        await expect(page.getByText('Plan Editado A Mitad De Semana').first()).toBeVisible();

        const tarjetaDia1 = page.locator('.hub-session-card', { hasText: 'Día 1 (renombrado)' });
        await expect(tarjetaDia1).toContainText('COMPLETADA');

        const tarjetaDia2 = page.locator('.hub-session-card', { hasText: 'Día 2 (renombrado)' });
        await expect(tarjetaDia2).toContainText('COMPLETADA');

        // Y la sesión nueva que agregó el admin durante la edición está
        // disponible para entrenar, como cualquier otra.
        const tarjetaDia3 = page.locator('.hub-session-card', { hasText: 'Día 3' });
        await expect(tarjetaDia3).toBeVisible();
        await expect(tarjetaDia3).not.toContainText('COMPLETADA');
    });
});
