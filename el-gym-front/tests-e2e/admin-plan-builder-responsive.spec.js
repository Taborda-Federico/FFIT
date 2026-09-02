import { test, expect, crearAdmin, crearAlumno, crearPlantilla } from './fixtures.js';

// Responsividad de "Planes" en un navegador real (no jsdom): la app se usa
// mayormente desde el celular, así que esta pantalla — el armador de
// planes, y ahora también el modal de "Gestionar Plantillas" — se prueba
// en un viewport angosto de verdad, no solo con media queries "en teoría".
// Chequeo central en cada test: CERO scroll horizontal — si algo se
// desborda del ancho de la pantalla, `document.documentElement.scrollWidth`
// crece por encima del viewport, y eso es exactamente lo que un celular
// real mostraría como una franja cortada o un swipe lateral roto.
async function loguearComoAdmin(page, admin) {
    await page.goto('/');
    // A ≤768px el Navbar colapsa "Acceso" adentro de un menú hamburguesa
    // (.nav-links solo se muestra con la clase .active) — hay que abrirlo
    // primero, o "Acceso" queda fuera del viewport y ningún click lo
    // alcanza. En desktop (donde viven el resto de los specs) este botón
    // no existe, por eso el intento va envuelto en un try/catch mudo.
    const hamburguesa = page.locator('.mobile-menu-btn');
    if (await hamburguesa.isVisible().catch(() => false)) {
        await hamburguesa.click();
    }
    await page.getByRole('button', { name: 'Acceso' }).click();
    await page.getByText('Staff Admin').click();
    await page.getByPlaceholder('Correo Electrónico').fill(admin.email);
    await page.getByPlaceholder('Contraseña').fill(admin.password);
    await page.getByRole('button', { name: 'INICIAR SESIÓN' }).click();
    await expect(page).toHaveURL(/\/admin/);
}

async function sinScrollHorizontal(page) {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }));
    // 1px de tolerancia por redondeos de subpíxel entre navegadores.
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

const VIEWPORTS = [
    { nombre: 'celular chico (320×568, iPhone SE)', width: 320, height: 568 },
    { nombre: 'celular común (375×812, iPhone 12/13)', width: 375, height: 812 },
];

test.describe('Responsividad de "Planes" (armador + modal de Plantillas)', () => {
    for (const vp of VIEWPORTS) {
        test.describe(vp.nombre, () => {
            test.use({ viewport: { width: vp.width, height: vp.height } });

            test('el armador de planes carga sin scroll horizontal y los controles principales son usables', async ({ page }) => {
                const admin = await crearAdmin({ email: `admin-resp-${vp.width}@x.com` });
                await loguearComoAdmin(page, admin);
                await page.goto('/admin/planes');

                await sinScrollHorizontal(page);

                // Controles de arriba (buscador de alumno, selector de
                // plantillas, botón "Plantillas") apilados en columna en
                // mobile — cada uno tiene que caber dentro del viewport.
                await expect(page.getByPlaceholder(/Buscar alumno para asignar/)).toBeVisible();
                const botonPlantillas = page.getByRole('button', { name: /Plantillas/ });
                await expect(botonPlantillas).toBeVisible();
                const cajaBoton = await botonPlantillas.boundingBox();
                expect(cajaBoton.x + cajaBoton.width).toBeLessThanOrEqual(vp.width + 1);

                // El título del plan y "Añadir nuevo día" siguen usables.
                await page.getByPlaceholder('TÍTULO DE LA RUTINA').fill('Plan Mobile');
                await expect(page.getByPlaceholder('TÍTULO DE LA RUTINA')).toHaveValue('Plan Mobile');
                await expect(page.getByRole('button', { name: /AÑADIR NUEVO DÍA/ })).toBeVisible();

                // La barra flotante de acciones (Guardar/Publicar) ocupa
                // todo el ancho en mobile y ambos botones son tappeables
                // (ver el @media de AdminDashboard.css) — se verifica que
                // ninguno quede cortado fuera de la pantalla.
                const btnGuardar = page.getByRole('button', { name: /Guardar Plantilla/ });
                const btnPublicar = page.getByRole('button', { name: /Publicar a Alumno/ });
                await expect(btnGuardar).toBeVisible();
                await expect(btnPublicar).toBeVisible();
                for (const boton of [btnGuardar, btnPublicar]) {
                    const caja = await boton.boundingBox();
                    expect(caja.x).toBeGreaterThanOrEqual(0);
                    expect(caja.x + caja.width).toBeLessThanOrEqual(vp.width + 1);
                }

                await sinScrollHorizontal(page); // de nuevo, después de interactuar
            });

            test('el modal de "Gestionar Plantillas" también es 100% usable en este ancho', async ({ page }) => {
                const admin = await crearAdmin({ email: `admin-resp-modal-${vp.width}@x.com` });
                await crearAlumno(admin.token, { nombre: 'Cliente Mobile' });

                // Seed de un par de plantillas vía la API real, para que el
                // modal tenga contenido real que renderizar (no una lista
                // vacía, que es un caso más fácil).
                await crearPlantilla(admin.token, { titulo: 'Fuerza Base' });
                await crearPlantilla(admin.token, { titulo: 'Cardio Express' });

                await loguearComoAdmin(page, admin);
                await page.goto('/admin/planes');
                await page.getByRole('button', { name: /Plantillas/ }).click();

                // El título de cada plantilla también existe como <option>
                // del <select> "Cargar Plantilla..." de al lado — se acota
                // todo a `.plantillas-modal-card` para no toparse con esa
                // ambigüedad (mismo motivo que en admin-plan-builder.spec.js).
                const modal = page.locator('.plantillas-modal-card');
                await expect(page.getByText('Gestionar Plantillas')).toBeVisible();
                await sinScrollHorizontal(page);

                // El buscador del modal es usable y filtra en este ancho.
                await page.getByPlaceholder(/Buscar plantilla por título/).fill('Cardio');
                await expect(modal.getByText('Cardio Express')).toBeVisible();
                await expect(modal.getByText('Fuerza Base')).not.toBeVisible();
                await page.getByPlaceholder(/Buscar plantilla por título/).fill('');

                // Los botones de Editar/Borrar de cada fila caben dentro del
                // viewport (no quedan recortados a la derecha, el error más
                // común en listas responsivas mal hechas).
                const filaFuerza = page.locator('.plantilla-row', { hasText: 'Fuerza Base' });
                const btnBorrar = filaFuerza.getByTitle('Eliminar plantilla');
                await expect(btnBorrar).toBeVisible();
                const cajaBorrar = await btnBorrar.boundingBox();
                expect(cajaBorrar.x + cajaBorrar.width).toBeLessThanOrEqual(vp.width + 1);

                // Y el flujo de borrado, con su modal de confirmación
                // apilado encima, también funciona en este ancho.
                await btnBorrar.click();
                await expect(page.getByText('Eliminar Plantilla')).toBeVisible();
                await sinScrollHorizontal(page);
                await page.getByRole('button', { name: 'Sí, Eliminar' }).click();
                await expect(modal.getByText('Fuerza Base')).not.toBeVisible();
            });
        });
    }
});
