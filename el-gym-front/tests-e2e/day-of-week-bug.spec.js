import { test, expect, crearAdmin, crearAlumno, publicarPlan, seedWorkout, loguearComoAlumno } from './fixtures.js';

// Reproduce EN UN NAVEGADOR REAL (no jsdom) el bug de límite de semana
// domingo-vs-lunes de HomeHub.isSessionCompleted. Usamos page.clock para
// controlar la fecha del BROWSER con precisión, exactamente como haría un
// alumno real un lunes a la mañana.
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

test.describe('Bug real: "Día 1" entrenado el domingo sigue apareciendo COMPLETADA el lunes siguiente', () => {
    test('reproducción en navegador real, con fechas de sistema controladas', async ({ page }) => {
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

        // Es lunes a la mañana. El alumno abre la app para entrenar "Día 1"
        // de nuevo (para él, es una semana nueva).
        await page.clock.install({ time: lunesSiguiente });
        await loguearComoAlumno(page, alumno);

        const tarjetaDia1 = page.locator('.hub-session-card', { hasText: 'Día 1' });
        await expect(tarjetaDia1).toContainText('COMPLETADA');
        // ↑ Esto es exactamente el bug: para un alumno que arranca la semana
        // el lunes, "Día 1" debería estar disponible de nuevo — pero como
        // isSessionCompleted usa una semana domingo-primero, todavía lo ve
        // como "hecho" y no puede volver a entrenarlo hasta el próximo domingo.

        // Confirmamos además que el click no dispara el entrenamiento (queda
        // bloqueado como "ya hecho", visualmente clickeable pero sin efecto).
        await tarjetaDia1.click();
        await expect(page.getByText('ENTRENAMIENTO ACTIVO')).not.toBeVisible();
    });

    test('control: "Día 2" (nunca entrenado) SÍ está disponible el lunes, confirmando que el bug es específico del solapamiento de semana, no un bloqueo general', async ({ page }) => {
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
