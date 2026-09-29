import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from '../src/feactures/Admin/pages/AdminDashboard';

const {
    getStudentsMock, getPlantillasMock, publicarPlanMock, guardarPlantillaMock, actualizarPlantillaMock, eliminarPlantillaMock,
    actualizarPlanMock, authValue
} = vi.hoisted(() => ({
    getStudentsMock: vi.fn(),
    getPlantillasMock: vi.fn(),
    publicarPlanMock: vi.fn(),
    guardarPlantillaMock: vi.fn(),
    actualizarPlantillaMock: vi.fn(),
    eliminarPlantillaMock: vi.fn(),
    actualizarPlanMock: vi.fn(),
    // Referencia ESTABLE: si useAuth() devolviera un objeto nuevo en cada
    // render (como haría un mock ingenuo `() => ({...})`), el useEffect que
    // depende de `[user]` se re-dispararía en cada re-render del componente
    // (cada fireEvent causa uno) — eso sería un artefacto del test, no un
    // bug real de la app (el AuthContext real sí mantiene una referencia
    // estable entre renders).
    authValue: { user: { token: 'tok' } },
}));

vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/user.service', () => ({ UserService: { getStudents: getStudentsMock } }));
vi.mock('../src/service/plan.service', () => ({
    PlanService: {
        getPlantillas: getPlantillasMock, publicarPlan: publicarPlanMock, guardarPlantilla: guardarPlantillaMock,
        actualizarPlantilla: actualizarPlantillaMock, eliminarPlantilla: eliminarPlantillaMock,
        actualizarPlan: actualizarPlanMock
    }
}));

beforeEach(() => {
    getStudentsMock.mockReset().mockResolvedValue([]);
    getPlantillasMock.mockReset().mockResolvedValue([]);
    publicarPlanMock.mockReset().mockResolvedValue({ plan: { titulo: 'X' } });
    guardarPlantillaMock.mockReset().mockResolvedValue({ plantilla: {} });
    actualizarPlantillaMock.mockReset().mockResolvedValue({ plantilla: {} });
    eliminarPlantillaMock.mockReset().mockResolvedValue({ message: 'ok' });
    actualizarPlanMock.mockReset().mockResolvedValue({ plan: { sesiones: [], vencimiento: 4 } });
});

// AdminDashboard usa useLocation/useNavigate (para recibir el plan a editar
// que llega desde la pestaña "Planes Activos" — ver más abajo), así que
// necesita un Router alrededor. `initialEntries` permite simular que se
// llegó acá con un plan ya elegido, vía location.state, tal como lo manda
// AdminPlanesActivos.jsx.
function renderAdmin(initialEntries) {
    return render(
        <MemoryRouter initialEntries={initialEntries || ['/admin/planes']}>
            <AdminDashboard />
        </MemoryRouter>
    );
}

async function esperarCargaInicial() {
    await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
}

describe('AdminDashboard — construir un plan: días, bloques, ejercicios', () => {
    it('arranca con una sesión por defecto ("Día 1")', async () => {
        renderAdmin();
        await esperarCargaInicial();
        expect(screen.getByDisplayValue('Día 1')).toBeInTheDocument();
    });

    it('"AÑADIR NUEVO DÍA DE ENTRENAMIENTO" agrega una sesión más, numerada secuencialmente', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText(/AÑADIR NUEVO DÍA/));
        expect(screen.getByDisplayValue('Día 2')).toBeInTheDocument();
    });

    it('BUG: borrar un día intermedio y agregar uno nuevo puede duplicar el nombre autogenerado', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText(/AÑADIR NUEVO DÍA/)); // Día 2
        fireEvent.click(screen.getByText(/AÑADIR NUEVO DÍA/)); // Día 3
        // Borra "Día 2" (el segundo botón de basura, el de la sesión del medio)
        const botonesBorrar = screen.getAllByRole('button').filter(b => b.className.includes('btn-icon-delete'));
        fireEvent.click(botonesBorrar[1]);
        expect(screen.queryByDisplayValue('Día 2')).not.toBeInTheDocument();
        // Ahora quedan "Día 1" y "Día 3" (2 sesiones) — el próximo agregado
        // se llama "Día ${length+1}" = "Día 3", que YA EXISTE.
        fireEvent.click(screen.getByText(/AÑADIR NUEVO DÍA/));
        const inputsDia3 = screen.getAllByDisplayValue('Día 3');
        expect(inputsDia3).toHaveLength(2);
    });

    it('permite renombrar el título de una sesión', async () => {
        renderAdmin();
        await esperarCargaInicial();
        const input = screen.getByDisplayValue('Día 1');
        fireEvent.change(input, { target: { value: 'Pecho y Tríceps' } });
        expect(screen.getByDisplayValue('Pecho y Tríceps')).toBeInTheDocument();
    });

    it('agrega un bloque "Serie" (standard) a una sesión', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Serie'));
        expect(screen.getByText('STANDARD')).toBeInTheDocument();
    });

    it('agrega un bloque "Circuito" con vueltas por defecto = 3', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Circuito'));
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    it('agrega un bloque "Superserie" y permite añadir un segundo ejercicio', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Superserie'));
        expect(screen.getByText('SUPERSET')).toBeInTheDocument();
        fireEvent.click(screen.getByText(/Añadir Ejercicio/));
        expect(screen.getAllByPlaceholderText('Ejercicio')).toHaveLength(2);
    });

    it('escribir el nombre de un ejercicio actualiza SOLO ese ejercicio (no sus hermanos)', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Superserie'));
        fireEvent.click(screen.getByText(/Añadir Ejercicio/));
        const inputs = screen.getAllByPlaceholderText('Ejercicio');
        fireEvent.change(inputs[0], { target: { value: 'Press banca' } });
        fireEvent.change(inputs[1], { target: { value: 'Aperturas' } });
        expect(screen.getByDisplayValue('Press banca')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Aperturas')).toBeInTheDocument();
    });

    it('borrar el único ejercicio de un bloque borra también el bloque (queda vacío)', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Serie'));
        expect(screen.getByText('STANDARD')).toBeInTheDocument();
        fireEvent.click(screen.getByText('×'));
        expect(screen.queryByText('STANDARD')).not.toBeInTheDocument();
    });
});

describe('AdminDashboard — buscar y seleccionar alumno', () => {
    it('filtra alumnos por nombre, sin importar mayúsculas/minúsculas', async () => {
        getStudentsMock.mockResolvedValue([
            { _id: 'a1', nombre: 'Federico Gómez', email: 'f@x.com' },
            { _id: 'a2', nombre: 'Ana Pérez', email: 'a@x.com' },
        ]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'FEDE' } });
        expect(screen.getByText(/Federico Gómez/)).toBeInTheDocument();
        expect(screen.queryByText(/Ana Pérez/)).not.toBeInTheDocument();
    });

    it('seleccionar un resultado carga el alumno en el plan y limpia la búsqueda', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Federico Gómez', email: 'f@x.com', telefono: '111' }]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Fede' } });
        fireEvent.click(screen.getByText(/Federico Gómez/));
        expect(screen.getByText(/Asignado a:/).parentElement).toHaveTextContent('Federico Gómez');
    });

    it('ARREGLADO: el teléfono del alumno (`telefono`) SÍ llega al link de WhatsApp', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Federico Gómez', email: 'f@x.com', telefono: '1122334455' }]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Fede' } });
        fireEvent.click(screen.getByText(/Federico Gómez/));
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan X' } });
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        await waitFor(() => expect(screen.getByText(/Verifica los detalles/)).toBeInTheDocument());
        fireEvent.click(screen.getByText('¡Publicar ahora!'));
        await waitFor(() => expect(publicarPlanMock).toHaveBeenCalled());
        // Antes, el link de WhatsApp caía siempre al genérico (sin número)
        // porque se leía `a.celular` (que nunca existe en el modelo de
        // alumno) en vez de `a.telefono`.
        const linkWa = await screen.findByText(/Avisar ahora/);
        expect(linkWa.closest('a').href).toBe('https://wa.me/1122334455?text=' + encodeURIComponent(
            `¡Hola Federico Gómez! 🏋️‍♂️ Ya te subí tu nueva rutina: *Plan X* (4 semanas). ¡Entra a la app para verla! 🔥`
        ));
    });
});

describe('AdminDashboard — publicar y guardar plantilla', () => {
    it('"Publicar a Alumno" sin haber elegido alumno muestra error y no abre el modal', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        expect(await screen.findByText(/selecciona un alumno primero/i)).toBeInTheDocument();
        expect(screen.queryByText('¡Publicar ahora!')).not.toBeInTheDocument();
    });

    it('"Guardar Plantilla" sin título muestra error y no llama al servicio', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        expect(await screen.findByText(/ponerle un título/i)).toBeInTheDocument();
        expect(guardarPlantillaMock).not.toHaveBeenCalled();
    });

    it('guardar plantilla con título llama al servicio y refresca la lista de plantillas', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Mi Plantilla' } });
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        await waitFor(() => expect(guardarPlantillaMock).toHaveBeenCalled());
        expect(getPlantillasMock).toHaveBeenCalledTimes(2); // 1 al montar + 1 al refrescar
    });

    it('bloques sin ningún ejercicio se filtran antes de guardar la plantilla', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Serie')); // bloque con 1 ejercicio vacío
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'X' } });
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        await waitFor(() => expect(guardarPlantillaMock).toHaveBeenCalled());
        const payload = guardarPlantillaMock.mock.calls[0][0];
        // El bloque tiene 1 ejercicio (aunque esté vacío de nombre), así que
        // NO se filtra — el filtro es "bloques con al menos 1 ejercicio",
        // no "ejercicios con nombre no vacío".
        expect(payload.sesiones[0].bloques).toHaveLength(1);
    });

    it('después de publicar con éxito, resetea el formulario a un plan nuevo vacío', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Ana', email: 'a@x.com' }]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Ana' } });
        fireEvent.click(screen.getByText(/Ana/));
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan Ana' } });
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        fireEvent.click(await screen.findByText('¡Publicar ahora!'));
        await waitFor(() => expect(publicarPlanMock).toHaveBeenCalled());
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('');
        expect(screen.getByText(/Nadie todavía/)).toBeInTheDocument();
    });

    it('si falla publicarPlan, muestra el mensaje de error y NO resetea el formulario', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Ana', email: 'a@x.com' }]);
        publicarPlanMock.mockRejectedValue(new Error('El servidor rechazó el plan'));
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Ana' } });
        fireEvent.click(screen.getByText(/Ana/));
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan Ana' } });
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        fireEvent.click(await screen.findByText('¡Publicar ahora!'));
        expect(await screen.findByText('El servidor rechazó el plan')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plan Ana');
    });
});

describe('AdminDashboard — cargar plantilla existente', () => {
    it('elegir una plantilla del selector reemplaza el título y las sesiones del plan en construcción', async () => {
        getPlantillasMock.mockResolvedValue([
            { _id: 'p1', titulo: 'Plantilla Fuerza', sesiones: [{ _id: 's1', nombre: 'Empuje', bloques: [] }] }
        ]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByDisplayValue('Cargar Plantilla...'), { target: { value: 'p1' } });
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plantilla Fuerza');
        expect(screen.getByDisplayValue('Empuje')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Día 1')).not.toBeInTheDocument();
    });
});

describe('AdminDashboard — NUEVO: Gestionar Plantillas (modal de búsqueda/edición/borrado)', () => {
    const plantillaDemo = { _id: 'p1', titulo: 'Plantilla Fuerza', sesiones: [{ _id: 's1', nombre: 'Empuje', bloques: [] }] };

    // El título de cada plantilla aparece en DOS lugares a la vez: la
    // tarjeta del modal Y la <option> del <select> "Cargar Plantilla..."
    // (que sigue existiendo sin cambios, ver arriba) — nunca se desmonta al
    // abrir el modal. Por eso, cualquier búsqueda de texto de una plantilla
    // tiene que quedar acotada al modal con `within(...)`, o `getByText`
    // revienta con "Found multiple elements".
    function modalPlantillas() {
        return screen.getByRole('heading', { name: /Gestionar Plantillas/i }).closest('.plantillas-modal-card');
    }

    it('el botón "Plantillas" abre el modal con las plantillas ya cargadas', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        await screen.findByRole('heading', { name: /Gestionar Plantillas/i });
        expect(within(modalPlantillas()).getByText('Plantilla Fuerza')).toBeInTheDocument();
    });

    it('"Editar" en el modal carga la plantilla en el armador, muestra el banner de edición y cierra el modal', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Editar plantilla'));

        // El modal se cierra: ya no hay un heading "Gestionar Plantillas".
        expect(screen.queryByRole('heading', { name: /Gestionar Plantillas/i })).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plantilla Fuerza');
        expect(screen.getByDisplayValue('Empuje')).toBeInTheDocument();
        expect(screen.getByText(/al guardar, se pisa la original/i)).toBeInTheDocument();
        expect(screen.getByText('Guardar Cambios')).toBeInTheDocument();
        expect(screen.queryByText('Guardar Plantilla')).not.toBeInTheDocument();
    });

    it('en modo edición, "Guardar Cambios" llama a actualizarPlantilla (PUT) — no a guardarPlantilla (POST)', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Editar plantilla'));
        fireEvent.click(screen.getByText('Guardar Cambios'));

        await waitFor(() => expect(actualizarPlantillaMock).toHaveBeenCalledWith('p1', expect.objectContaining({ titulo: 'Plantilla Fuerza' }), 'tok'));
        expect(guardarPlantillaMock).not.toHaveBeenCalled();
    });

    it('"salir" del banner de edición vuelve a "Guardar Plantilla" (crea una nueva) sin borrar lo ya tipeado', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Editar plantilla'));
        fireEvent.click(screen.getByTitle(/Salir del modo edición/));

        expect(screen.queryByText(/al guardar, se pisa la original/i)).not.toBeInTheDocument();
        expect(screen.getByText('Guardar Plantilla')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plantilla Fuerza'); // el contenido sigue ahí

        fireEvent.click(screen.getByText('Guardar Plantilla'));
        await waitFor(() => expect(guardarPlantillaMock).toHaveBeenCalled());
        expect(actualizarPlantillaMock).not.toHaveBeenCalled();
    });

    it('"Borrar" pide confirmación antes de eliminar', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Eliminar plantilla'));

        expect(await screen.findByText('Eliminar Plantilla')).toBeInTheDocument();
        expect(screen.getByText(/¿Eliminar la plantilla "Plantilla Fuerza"\?/)).toBeInTheDocument();
        expect(eliminarPlantillaMock).not.toHaveBeenCalled(); // todavía no confirmó nada
    });

    it('confirmar el borrado llama a eliminarPlantilla y la saca de la lista', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Eliminar plantilla'));
        fireEvent.click(await screen.findByText('Sí, Eliminar'));

        await waitFor(() => expect(eliminarPlantillaMock).toHaveBeenCalledWith('p1', 'tok'));
        expect(screen.queryByText('Plantilla Fuerza')).not.toBeInTheDocument();
    });

    it('cancelar el borrado NO llama a eliminarPlantilla, y el modal de plantillas sigue abierto con todo intacto', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Eliminar plantilla'));
        fireEvent.click(await screen.findByText('Cancelar'));

        expect(eliminarPlantillaMock).not.toHaveBeenCalled();
        expect(screen.queryByText('Eliminar Plantilla')).not.toBeInTheDocument(); // el confirm se cerró
        // Cancelar el borrado no cierra el modal de gestión — sigue abierto,
        // con la plantilla todavía en la lista.
        expect(within(modalPlantillas()).getByText('Plantilla Fuerza')).toBeInTheDocument();
    });

    it('la búsqueda del modal es sensible a coincidencias parciales, sin importar mayúsculas', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo, { _id: 'p2', titulo: 'Cardio Intenso', sesiones: [] }]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        await screen.findByRole('heading', { name: /Gestionar Plantillas/i });
        const modal = modalPlantillas();
        expect(within(modal).getByText('Cardio Intenso')).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/Buscar plantilla/), { target: { value: 'FUERZA' } });

        expect(within(modal).getByText('Plantilla Fuerza')).toBeInTheDocument();
        expect(within(modal).queryByText('Cardio Intenso')).not.toBeInTheDocument();
    });

    it('sin ninguna plantilla guardada, el modal muestra un estado vacío en vez de una lista en blanco', async () => {
        getPlantillasMock.mockResolvedValue([]);
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        expect(await screen.findByText(/Todavía no guardaste ninguna plantilla/i)).toBeInTheDocument();
    });

    it('si eliminarPlantilla falla, muestra el error y NO saca la plantilla de la lista', async () => {
        getPlantillasMock.mockResolvedValue([plantillaDemo]);
        eliminarPlantillaMock.mockRejectedValue(new Error('No se pudo eliminar'));
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Plantillas'));
        fireEvent.click(await screen.findByTitle('Eliminar plantilla'));
        fireEvent.click(await screen.findByText('Sí, Eliminar'));

        expect(await screen.findByText('No se pudo eliminar')).toBeInTheDocument();
        expect(within(modalPlantillas()).getByText('Plantilla Fuerza')).toBeInTheDocument();
    });
});

describe('AdminDashboard — persistencia del borrador (arreglo del bug reportado por un cliente real)', () => {
    it('escribir en el plan lo guarda en localStorage al toque', async () => {
        renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan Sin Terminar' } });
        await waitFor(() => {
            const guardado = JSON.parse(localStorage.getItem('ffit_admin_plan_draft_anon'));
            expect(guardado.titulo).toBe('Plan Sin Terminar');
        });
    });

    it('desmontar la pantalla (simula navegar a otra pestaña) y volver a montarla recupera el borrador tal cual quedó', async () => {
        const { unmount } = renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan A Medio Hacer' } });
        fireEvent.click(screen.getByText('Serie'));
        fireEvent.change(screen.getByPlaceholderText('Ejercicio'), { target: { value: 'Sentadilla' } });
        await waitFor(() => expect(JSON.parse(localStorage.getItem('ffit_admin_plan_draft_anon')).titulo).toBe('Plan A Medio Hacer'));

        // Esto es exactamente lo que le pasaba al cliente: se desmonta el
        // componente (como al navegar a "Alumnos" o "Seguimiento") y se
        // vuelve a montar (como al volver a "Planes").
        unmount();
        renderAdmin();
        await esperarCargaInicial();

        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plan A Medio Hacer');
        expect(screen.getByDisplayValue('Sentadilla')).toBeInTheDocument();
    });

    it('un F5 (recargar la página) también se comporta como un remount que recupera el borrador', async () => {
        // jsdom no tiene un F5 real, pero un refresh de página ES, para
        // React, exactamente esto: el árbol entero se desmonta y se vuelve
        // a montar desde cero con un `render` nuevo.
        const { unmount } = renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Sobrevive al F5' } });
        await waitFor(() => expect(localStorage.getItem('ffit_admin_plan_draft_anon')).toContain('Sobrevive al F5'));
        unmount();

        renderAdmin();
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Sobrevive al F5');
    });

    it('publicar con éxito borra el borrador — un remount posterior arranca en blanco, no con el plan ya publicado', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Ana', email: 'a@x.com' }]);
        const { unmount } = renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Ana' } });
        fireEvent.click(screen.getByText(/Ana/));
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan Ya Publicado' } });
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        fireEvent.click(await screen.findByText('¡Publicar ahora!'));
        await waitFor(() => expect(publicarPlanMock).toHaveBeenCalled());

        expect(localStorage.getItem('ffit_admin_plan_draft_anon')).toBeNull();

        unmount();
        renderAdmin();
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('');
    });

    it('guardar como plantilla NO borra el borrador (el profe puede seguir editando el mismo plan después)', async () => {
        const { unmount } = renderAdmin();
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plantilla En Progreso' } });
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        await waitFor(() => expect(guardarPlantillaMock).toHaveBeenCalled());

        unmount();
        renderAdmin();
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plantilla En Progreso');
    });

    it('un borrador con JSON corrupto en localStorage no rompe la pantalla — arranca en blanco', async () => {
        localStorage.setItem('ffit_admin_plan_draft_anon', '{esto no es JSON válido');
        expect(() => renderAdmin()).not.toThrow();
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('');
    });
});

describe('AdminDashboard — NUEVO: recibe un plan para editar desde "Planes Activos" (location.state)', () => {
    // Plan "en curso": lleva 2 de las 4 semanas originales (el cron ya lo
    // decrementó), con dos sesiones reales (con _id de Mongo, no client-side).
    // La pestaña "Planes Activos" (AdminPlanesActivos.jsx) manda exactamente
    // esta forma de objeto al navegar acá, vía location.state.planParaEditar.
    const planActivoDemo = {
        _id: 'plan1',
        titulo: 'Fuerza Nivel 1',
        vencimiento: 2,
        alumnoId: { _id: 'a1', nombre: 'Federico Gómez', email: 'f@x.com' },
        sesiones: [
            { _id: 's1', nombre: 'Día 1', bloques: [{ _id: 'b1', tipo: 'standard', descanso: 60, ejercicios: [{ _id: 'e1', nombre: 'Sentadilla', series: '4', reps: '8-10' }] }] },
            { _id: 's2', nombre: 'Día 2', bloques: [{ _id: 'b2', tipo: 'circuit', descanso: 30, vueltas: 3, ejercicios: [{ _id: 'e2', nombre: 'Burpees', tiempo: '40' }] }] },
        ]
    };

    function renderEditando() {
        return renderAdmin([{ pathname: '/admin/planes', state: { planParaEditar: planActivoDemo } }]);
    }

    it('al llegar con un plan en location.state, lo carga en el armador (con los _id reales de sus sesiones), banner y campo de semanas restantes', async () => {
        renderEditando();
        await esperarCargaInicial();

        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Fuerza Nivel 1');
        expect(screen.getByDisplayValue('Día 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Día 2')).toBeInTheDocument();
        expect(screen.getByText(/Editando el plan activo de Federico Gómez/i)).toBeInTheDocument();
        // Precarga las semanas restantes ACTUALES (2), no reinicia a 4.
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
        expect(screen.getByText('Guardar Cambios en el Plan')).toBeInTheDocument();
        expect(screen.queryByText('Publicar a Alumno')).not.toBeInTheDocument();
        // Mientras se edita un plan real, no tiene sentido reasignarlo:
        // el buscador de alumno se oculta.
        expect(screen.queryByPlaceholderText(/Buscar alumno/)).not.toBeInTheDocument();
    });

    it('sin nada en location.state (navegación normal a "Planes"), arranca en blanco, como siempre', async () => {
        renderAdmin();
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('');
        expect(screen.queryByText(/Editando el plan activo/i)).not.toBeInTheDocument();
        expect(screen.getByText('Publicar a Alumno')).toBeInTheDocument();
    });

    it('"Guardar Cambios en el Plan" llama a actualizarPlan (PUT), no a publicarPlan ni guardarPlantilla', async () => {
        renderEditando();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Guardar Cambios en el Plan'));

        await waitFor(() => expect(actualizarPlanMock).toHaveBeenCalledWith(
            'plan1',
            expect.objectContaining({ titulo: 'Fuerza Nivel 1', vencimiento: 2 }),
            'tok'
        ));
        expect(publicarPlanMock).not.toHaveBeenCalled();
        expect(guardarPlantillaMock).not.toHaveBeenCalled();
    });

    it('CRÍTICO: editar el nombre de UNA sesión no le hace perder el _id a la OTRA sesión que no se tocó (así sigue matcheando "ya completada")', async () => {
        renderEditando();
        await esperarCargaInicial();

        // Solo se toca "Día 1" — "Día 2" (con la sesión ya completada por
        // el alumno esta semana, en un caso real) no se toca para nada.
        fireEvent.change(screen.getByDisplayValue('Día 1'), { target: { value: 'Día 1 (renombrado)' } });
        fireEvent.click(screen.getByText('Guardar Cambios en el Plan'));

        await waitFor(() => expect(actualizarPlanMock).toHaveBeenCalled());
        const payload = actualizarPlanMock.mock.calls[0][1];
        const dia1 = payload.sesiones.find(s => s.nombre === 'Día 1 (renombrado)');
        const dia2 = payload.sesiones.find(s => s.nombre === 'Día 2');
        expect(dia1._id).toBe('s1');
        expect(dia2._id).toBe('s2'); // intacto: mismo _id que tenía en el plan real
    });

    it('cambiar "Semanas restantes" a mano SÍ se manda (el admin decide extender/acortar el plan al editar)', async () => {
        renderEditando();
        await esperarCargaInicial();

        fireEvent.change(screen.getByDisplayValue('2'), { target: { value: '6' } });
        fireEvent.click(screen.getByText('Guardar Cambios en el Plan'));

        await waitFor(() => expect(actualizarPlanMock).toHaveBeenCalledWith('plan1', expect.objectContaining({ vencimiento: 6 }), 'tok'));
    });

    it('"salir" del modo edición vuelve a mostrar "Publicar a Alumno" sin borrar lo tipeado', async () => {
        renderEditando();
        await esperarCargaInicial();
        fireEvent.click(screen.getByTitle('Salir del modo edición'));

        expect(screen.queryByText(/Editando el plan activo/i)).not.toBeInTheDocument();
        expect(screen.getByText('Publicar a Alumno')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Fuerza Nivel 1'); // el contenido sigue ahí
        expect(actualizarPlanMock).not.toHaveBeenCalled();
    });

    it('si actualizarPlan falla, muestra el mensaje de error y no cierra el modo edición', async () => {
        actualizarPlanMock.mockRejectedValue(new Error('El servidor rechazó el cambio'));
        renderEditando();
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Guardar Cambios en el Plan'));

        expect(await screen.findByText('El servidor rechazó el cambio')).toBeInTheDocument();
        expect(screen.getByText('Guardar Cambios en el Plan')).toBeInTheDocument(); // sigue en modo edición
    });
});
