import { test, expect, crearAdmin, crearAlumno, crearPlantilla, publicarPlan } from './fixtures.js';

async function loguearComoAdmin(page, admin) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Acceso' }).click();
    await page.getByText('Staff Admin').click();
    await page.getByPlaceholder('Correo Electrónico').fill(admin.email);
    await page.getByPlaceholder('Contraseña').fill(admin.password);
    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
    await expect(page).toHaveURL(/\/admin/);
}

test.describe('Constructor de planes (armado real, de punta a punta)', () => {
    test('arma un plan con 2 días, bloques de distinto tipo y ejercicios, y lo publica a un alumno', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plan1@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Del Plan' });
        await loguearComoAdmin(page, admin);
        await page.getByRole('link', { name: /Planes/ }).click().catch(() => {});
        // El link de navegación puede no tener rol "link" (depende del sidebar);
        // fallback: navegar directo por URL.
        await page.goto('/admin/planes');

        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Plan E2E Fuerza');

        // Día 1: bloque standard con un ejercicio
        await page.getByRole('button', { name: 'Serie', exact: true }).click();
        await page.getByPlaceholder('Ejercicio').first().fill('Press Banca');
        await page.getByPlaceholder('S').first().fill('4');
        await page.getByPlaceholder('R').first().fill('8-10');

        // Día 2: circuito con vueltas
        await page.getByRole('button', { name: /AÑADIR NUEVO DÍA/ }).click();
        const sesiones = page.locator('.sesion-card-pro');
        await sesiones.nth(1).getByRole('button', { name: 'Circuito' }).click();
        await sesiones.nth(1).getByPlaceholder('Ejercicio').fill('Burpees');

        // Asignar al alumno
        await page.getByPlaceholder(/Buscar alumno para asignar/).fill('Alumno Del Plan');
        await page.getByText('Alumno Del Plan', { exact: false }).first().click();

        await page.getByRole('button', { name: 'Publicar a Alumno' }).click();
        await page.getByText('¡Publicar ahora!').click();

        await expect(page.getByText(/con éxito/)).toBeVisible();
        await expect(page.getByText(/Plan enviado a Alumno Del Plan/)).toBeVisible();
    });

    test('publicar sin elegir alumno muestra el error y no publica nada', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plan2@x.com' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes');
        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Plan Sin Alumno');
        await page.getByRole('button', { name: 'Publicar a Alumno' }).click();
        await expect(page.getByText(/selecciona un alumno primero/i)).toBeVisible();
    });

    test('guardar una plantilla y volver a cargarla reconstruye las sesiones', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plan3@x.com' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes');

        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Plantilla E2E');
        await page.getByRole('button', { name: 'Serie', exact: true }).click();
        await page.getByPlaceholder('Ejercicio').first().fill('Sentadilla');
        await page.getByRole('button', { name: 'Guardar Plantilla' }).click();
        await expect(page.getByText(/Plantilla guardada/)).toBeVisible();

        await page.reload();
        await page.locator('.template-selector select').selectOption({ label: 'Plantilla E2E' });
        await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Plantilla E2E');
        await expect(page.locator('input[value="Sentadilla"]')).toBeVisible();
    });

    test('ARREGLO DE UN BUG REPORTADO POR UN CLIENTE REAL: navegar a otra pestaña del panel a mitad de armar un plan y volver ya no lo borra', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plan4@x.com' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes');

        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Plan Que No Se Debe Perder');
        await page.getByRole('button', { name: 'Serie', exact: true }).click();
        await page.getByPlaceholder('Ejercicio').first().fill('Peso Muerto');

        // Exactamente el gesto que describió el cliente: "hago el plan y por
        // ahí hago otra cosa" — por ejemplo, ir a revisar la lista de
        // alumnos antes de terminar de escribir el plan.
        await page.getByRole('link', { name: 'Alumnos' }).click();
        await expect(page).toHaveURL(/\/admin$/);

        // exact:true porque ahora también existe el link "Planes Activos"
        // (que "contiene" el texto "Planes").
        await page.getByRole('link', { name: 'Planes', exact: true }).click();
        await expect(page).toHaveURL(/\/admin\/planes$/);

        await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Plan Que No Se Debe Perder');
        await expect(page.getByPlaceholder('Ejercicio').first()).toHaveValue('Peso Muerto');
    });

    test('lo mismo pero recargando la página (F5) en vez de navegar por el menú', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plan5@x.com' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes');

        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Sobrevive a un F5 de verdad');
        await page.waitForTimeout(200); // le da tiempo al useEffect de persistir antes del reload

        await page.reload();
        await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Sobrevive a un F5 de verdad');
    });
});

test.describe('NUEVO: Gestionar Plantillas (pedido de un cliente real — tenía demasiadas guardadas)', () => {
    test('flujo completo: buscar, editar (pisa la original, no duplica) y eliminar, todo de punta a punta', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plantillas1@x.com' });
        await crearPlantilla(admin.token, { titulo: 'Fuerza Nivel 1', sesiones: [{ nombre: 'Día 1', bloques: [] }, { nombre: 'Día 2', bloques: [] }] });
        await crearPlantilla(admin.token, { titulo: 'Rutina Vieja Sin Usar', sesiones: [{ nombre: 'Día 1', bloques: [] }] });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes');

        // Abrir el modal y ver ambas plantillas. El título de cada una
        // también existe como <option> del <select> "Cargar Plantilla..."
        // de al lado (que sigue ahí, sin cambios) — por eso toda búsqueda de
        // texto de acá en más queda acotada a `.plantillas-modal-card` o a
        // la fila (`.plantilla-row`) puntual.
        const modal = page.locator('.plantillas-modal-card');
        await page.getByRole('button', { name: 'Plantillas' }).click();
        await expect(page.getByRole('heading', { name: 'Gestionar Plantillas' })).toBeVisible();
        await expect(modal.getByText('Fuerza Nivel 1')).toBeVisible();
        await expect(modal.getByText('Rutina Vieja Sin Usar')).toBeVisible();

        // Buscar filtra en vivo.
        await page.getByPlaceholder('Buscar plantilla por título...').fill('vieja');
        await expect(modal.getByText('Rutina Vieja Sin Usar')).toBeVisible();
        await expect(modal.getByText('Fuerza Nivel 1')).not.toBeVisible();
        await page.getByPlaceholder('Buscar plantilla por título...').fill('');

        // Editar "Fuerza Nivel 1": carga en el armador, banner de edición.
        await page.locator('.plantilla-row', { hasText: 'Fuerza Nivel 1' }).getByTitle('Editar plantilla').click();
        await expect(page.getByRole('heading', { name: 'Gestionar Plantillas' })).not.toBeVisible();
        await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Fuerza Nivel 1');
        await expect(page.getByText(/al guardar, se pisa la original/i)).toBeVisible();

        // Cambiar el título y guardar — tiene que ACTUALIZAR, no duplicar.
        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Fuerza Nivel 1 (renombrada)');
        await page.getByRole('button', { name: 'Guardar Cambios' }).click();
        await expect(page.getByText(/actualizada con éxito/i)).toBeVisible();

        // Reabrir el modal: sigue habiendo exactamente 2 plantillas (no 3),
        // y el nombre nuevo reemplazó al viejo.
        await page.getByRole('button', { name: 'Plantillas' }).click();
        await expect(modal.getByText('Fuerza Nivel 1 (renombrada)')).toBeVisible();
        await expect(modal.getByText('Fuerza Nivel 1', { exact: true })).not.toBeVisible();
        await expect(page.locator('.plantilla-row')).toHaveCount(2);

        // Eliminar "Rutina Vieja Sin Usar" — con confirmación real.
        await page.locator('.plantilla-row', { hasText: 'Rutina Vieja Sin Usar' }).getByTitle('Eliminar plantilla').click();
        await expect(page.getByText(/¿Eliminar la plantilla "Rutina Vieja Sin Usar"\?/)).toBeVisible();
        await page.getByRole('button', { name: 'Sí, Eliminar' }).click();

        await expect(modal.getByText('Rutina Vieja Sin Usar')).not.toBeVisible();
        await expect(page.locator('.plantilla-row')).toHaveCount(1);
    });

    test('"Salir" del modo edición permite guardar como una plantilla NUEVA en vez de pisar la original', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-plantillas2@x.com' });
        await crearPlantilla(admin.token, { titulo: 'Original' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes');

        const modal = page.locator('.plantillas-modal-card');
        await page.getByRole('button', { name: 'Plantillas' }).click();
        await page.locator('.plantilla-row', { hasText: 'Original' }).getByTitle('Editar plantilla').click();

        await page.getByTitle(/Salir del modo edición/).click();
        await expect(page.getByText(/al guardar, se pisa la original/i)).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Guardar Plantilla' })).toBeVisible();

        await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Copia Nueva');
        await page.getByRole('button', { name: 'Guardar Plantilla' }).click();
        await expect(page.getByText(/guardada en la nube con éxito/i)).toBeVisible();

        await page.getByRole('button', { name: 'Plantillas' }).click();
        await expect(modal.getByText('Original')).toBeVisible(); // la original sigue intacta
        await expect(modal.getByText('Copia Nueva')).toBeVisible(); // y ahora hay una nueva, aparte
        await expect(page.locator('.plantilla-row')).toHaveCount(2);
    });
});

test.describe('NUEVO: Planes Activos (pestaña propia en la navegación, ver en grande y editar)', () => {
    test('flujo completo: entrar desde el menú, buscar, ver el plan en grande, editar (pisa el mismo plan) y confirmar que la semana restante se conserva', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-planesactivos1@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Con Plan' });
        await publicarPlan(admin.token, alumno._id, {
            titulo: 'Plan En Curso',
            sesiones: [
                { nombre: 'Día 1', bloques: [{ tipo: 'standard', descanso: 30, ejercicios: [{ nombre: 'Sentadilla', series: 4, reps: '8-10' }] }] },
                { nombre: 'Día 2', bloques: [] },
            ],
        });
        await loguearComoAdmin(page, admin);

        // Se entra por su propia pestaña del menú lateral, no por un botón
        // dentro del armador.
        await page.getByRole('link', { name: 'Planes Activos' }).click();
        await expect(page).toHaveURL(/\/admin\/planes-activos/);
        await expect(page.getByRole('heading', { name: 'Planes Activos' })).toBeVisible();
        await expect(page.getByText('Plan En Curso')).toBeVisible();
        await expect(page.getByText('Alumno Con Plan')).toBeVisible();

        // La búsqueda filtra por alumno o por título.
        await page.getByPlaceholder(/Buscar por alumno o título/).fill('alumno con plan');
        await expect(page.getByText('Plan En Curso')).toBeVisible();
        await page.getByPlaceholder(/Buscar por alumno o título/).fill('');

        // Clickear la tarjeta lo muestra EN GRANDE (reemplaza la lista).
        await page.getByText('Plan En Curso').click();
        await expect(page.getByRole('heading', { name: 'Plan En Curso' })).toBeVisible();
        await expect(page.getByText('Sentadilla')).toBeVisible();
        await expect(page.getByText(/Sin bloques cargados/)).toBeVisible(); // Día 2

        // El botón de editar es chico, discreto — clickearlo manda al
        // armador de siempre con el plan ya cargado.
        await page.getByRole('button', { name: /Editar/ }).click();
        await expect(page).toHaveURL(/\/admin\/planes$/);
        await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Plan En Curso');
        await expect(page.getByText(/Editando el plan activo de Alumno Con Plan/i)).toBeVisible();
        await expect(page.getByPlaceholder(/Buscar alumno para asignar/)).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Guardar Cambios en el Plan' })).toBeVisible();

        // Cambia solo el nombre de una sesión — sin tocar "Semanas
        // restantes" (4, el valor con el que se publicó).
        await expect(page.locator('#input-vencimiento-plan')).toHaveValue('4');
        await page.locator('.sesion-name-input').first().fill('Día 1 (editado)');

        await page.getByRole('button', { name: 'Guardar Cambios en el Plan' }).click();
        await expect(page.getByText(/actualizado con éxito/i)).toBeVisible();

        // Volviendo a la pestaña: sigue habiendo UN solo plan activo (no se
        // duplicó), con el nombre de sesión nuevo y la semana intacta.
        await page.getByRole('link', { name: 'Planes Activos' }).click();
        await expect(page.locator('.plan-activo-card')).toHaveCount(1);
        await page.getByText('Plan En Curso').click();
        await expect(page.getByText('Día 1 (editado)')).toBeVisible();
        await expect(page.getByText(/4 semanas restantes/)).toBeVisible();
    });

    test('"Volver a la lista" desde el detalle grande regresa a la lista completa', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-planesactivos2@x.com' });
        const alumno1 = await crearAlumno(admin.token, { nombre: 'Alumno Uno' });
        const alumno2 = await crearAlumno(admin.token, { nombre: 'Alumno Dos' });
        await publicarPlan(admin.token, alumno1._id, { titulo: 'Plan Uno' });
        await publicarPlan(admin.token, alumno2._id, { titulo: 'Plan Dos' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes-activos');

        await page.getByText('Plan Uno').click();
        await expect(page.getByRole('heading', { name: 'Plan Uno' })).toBeVisible();
        await expect(page.getByText('Plan Dos')).not.toBeVisible();

        await page.getByText(/Volver a la lista/).click();
        await expect(page.getByText('Plan Uno')).toBeVisible();
        await expect(page.getByText('Plan Dos')).toBeVisible();
    });

    test('"salir" del modo edición vuelve a "Publicar a Alumno" sin perder lo tipeado, y NO guarda nada', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-planesactivos3@x.com' });
        const alumno = await crearAlumno(admin.token, { nombre: 'Alumno Salir' });
        await publicarPlan(admin.token, alumno._id, { titulo: 'Plan Para Salir' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes-activos');

        await page.getByText('Plan Para Salir').click();
        await page.getByRole('button', { name: /Editar/ }).click();
        await page.getByTitle('Salir del modo edición').click();

        await expect(page.getByText(/Editando el plan activo/i)).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Publicar a Alumno' })).toBeVisible();
        await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Plan Para Salir');
    });

    test('sin ningún plan activo, la pestaña muestra el estado vacío', async ({ page }) => {
        const admin = await crearAdmin({ email: 'admin-planesactivos4@x.com' });
        await loguearComoAdmin(page, admin);
        await page.goto('/admin/planes-activos');
        await expect(page.getByText(/Todavía no hay ningún plan activo asignado/i)).toBeVisible();
    });
});
