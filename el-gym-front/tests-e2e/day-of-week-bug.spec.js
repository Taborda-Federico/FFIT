import { test, expect, crearAdmin, crearAlumno, publicarPlan, seedWorkout, loguearComoAlumno } from './fixtures.js';

// ARREGLADO (ver docs/CAMBIOS.md #4): reproduce EN UN NAVEGADOR REAL (no
// jsdom) que el límite de semana de HomeHub.isSessionCompleted ahora
// arranca en lunes, no en domingo. Usamos page.clock para controlar la
// fecha del BROWSER con precisión, exactamente como haría un alumno real
// un lunes a la mañana.
//
// OJO: el plan se crea contra el backend e2e real (Mongo real, reloj real,
// sin virtualizar) — su `createdAt` es "ahora mismo" en la fecha real de
// ejecución del test. isSessionCompleted descarta cualquier entrenamiento
// anterior a `plan.createdAt`, así que el domingo/lunes que simulamos tienen
// que caer DESPUÉS del momento real en que corre el test, no en una fecha
// fija del pasado (por eso se calculan relativos a "ahora").
function proximoDomingoYLunes() {
    const ahora = new Date();
    const diasHastaDomingo = (7 - ahora.getDay()) % 7 || 7; // el PRÓXIMO domingo (nunca "hoy")
    const domingo = new Date(ahora);
    domingo.setDate(ahora.getDate() + diasHastaDomingo);
    domingo.setHours(20, 0, 0, 0);
    const lunesSiguiente = new Date(domingo);
    lunesSiguiente.setDate(domingo.getDate() + 1);
    lunesSiguiente.setHours(9, 0, 0, 0);
    return { domingo, lunesSiguiente };
}

test.describe('Semana lunes-primero en HomeHub (arreglo del bug de "los días")', () => {
    test('"Día 1" entrenado el domingo YA NO sigue apareciendo COMPLETADA el lunes siguiente — vuelve a estar disponible', async ({ page }) => {
        const { domingo, lunesSiguiente } = proximoDomingoYLunes();
        const admin = await crearAdmin({ email: 'admin-diasemana@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Semana', email: 'alumno-semana@x.com' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Semanal',
            sesiones: [
                { nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Sentadilla', series: 3, reps: '10' }] }] },
                { nombre: 'Día 2', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Press', series: 3, reps: '10' }] }] },
            ],
        });

        // El alumno entrena "Día 1" el domingo a la noche.
        await seedWorkout(alumno._id, 'Día 1', domingo.toISOString());

        // Es lunes a la mañana. Para el alumno arranca una semana nueva.
        await page.clock.install({ time: lunesSiguiente });
        await loguearComoAlumno(page, alumno);

        const tarjetaDia1 = page.locator('.hub-session-card', { hasText: 'Día 1' });
        await expect(tarjetaDia1).not.toContainText('COMPLETADA');

        // Y ahora sí puede volver a entrenarlo: el click dispara la sesión.
        await tarjetaDia1.click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).toBeVisible();
    });

    test('en cambio, "Día 1" entrenado el LUNES sigue completado hasta el domingo siguiente (misma semana lunes-domingo)', async ({ page }) => {
        const { lunesSiguiente } = proximoDomingoYLunes();
        const domingoDeEsaSemana = new Date(lunesSiguiente);
        domingoDeEsaSemana.setDate(lunesSiguiente.getDate() + 6);
        domingoDeEsaSemana.setHours(21, 0, 0, 0);

        const admin = await crearAdmin({ email: 'admin-diasemana3@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Semana 3', email: 'alumno-semana3@x.com' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Semanal', sesiones: [{ nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Sentadilla', series: 3, reps: '10' }] }] }],
        });
        await seedWorkout(alumno._id, 'Día 1', lunesSiguiente.toISOString());

        await page.clock.install({ time: domingoDeEsaSemana });
        await loguearComoAlumno(page, alumno);

        await expect(page.locator('.hub-session-card', { hasText: 'Día 1' })).toContainText('COMPLETADA');
    });

    test('control: "Día 2" (nunca entrenado) está disponible el lunes, sin importar lo que haya pasado con "Día 1"', async ({ page }) => {
        const { domingo, lunesSiguiente } = proximoDomingoYLunes();
        const admin = await crearAdmin({ email: 'admin-diasemana2@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Semana 2', email: 'alumno-semana2@x.com' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan Semanal',
            sesiones: [
                { nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Sentadilla', series: 3, reps: '10' }] }] },
                { nombre: 'Día 2', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Press', series: 3, reps: '10' }] }] },
            ],
        });
        await seedWorkout(alumno._id, 'Día 1', domingo.toISOString());

        await page.clock.install({ time: lunesSiguiente });
        await loguearComoAlumno(page, alumno);

        const tarjetaDia2 = page.locator('.hub-session-card', { hasText: 'Día 2' });
        await expect(tarjetaDia2).not.toContainText('COMPLETADA');
    });
});
