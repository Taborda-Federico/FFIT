import { test, expect, crearAdmin, crearAlumno, crearPlantilla } from './fixtures.js';

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

        await page.getByRole('link', { name: 'Planes' }).click();
        await expect(page).toHaveURL(/\/admin\/planes/);

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
