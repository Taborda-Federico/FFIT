import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminDashboard } from '../src/feactures/Admin/pages/AdminDashboard';

const { getStudentsMock, getPlantillasMock, publicarPlanMock, guardarPlantillaMock, authValue } = vi.hoisted(() => ({
    getStudentsMock: vi.fn(),
    getPlantillasMock: vi.fn(),
    publicarPlanMock: vi.fn(),
    guardarPlantillaMock: vi.fn(),
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
    PlanService: { getPlantillas: getPlantillasMock, publicarPlan: publicarPlanMock, guardarPlantilla: guardarPlantillaMock }
}));

beforeEach(() => {
    getStudentsMock.mockReset().mockResolvedValue([]);
    getPlantillasMock.mockReset().mockResolvedValue([]);
    publicarPlanMock.mockReset().mockResolvedValue({ plan: { titulo: 'X' } });
    guardarPlantillaMock.mockReset().mockResolvedValue({ plantilla: {} });
});

async function esperarCargaInicial() {
    await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
}

describe('AdminDashboard — construir un plan: días, bloques, ejercicios', () => {
    it('arranca con una sesión por defecto ("Día 1")', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        expect(screen.getByDisplayValue('Día 1')).toBeInTheDocument();
    });

    it('"AÑADIR NUEVO DÍA DE ENTRENAMIENTO" agrega una sesión más, numerada secuencialmente', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.click(screen.getByText(/AÑADIR NUEVO DÍA/));
        expect(screen.getByDisplayValue('Día 2')).toBeInTheDocument();
    });

    it('BUG: borrar un día intermedio y agregar uno nuevo puede duplicar el nombre autogenerado', async () => {
        render(<AdminDashboard />);
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
        render(<AdminDashboard />);
        await esperarCargaInicial();
        const input = screen.getByDisplayValue('Día 1');
        fireEvent.change(input, { target: { value: 'Pecho y Tríceps' } });
        expect(screen.getByDisplayValue('Pecho y Tríceps')).toBeInTheDocument();
    });

    it('agrega un bloque "Serie" (standard) a una sesión', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Serie'));
        expect(screen.getByText('STANDARD')).toBeInTheDocument();
    });

    it('agrega un bloque "Circuito" con vueltas por defecto = 3', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Circuito'));
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    });

    it('agrega un bloque "Superserie" y permite añadir un segundo ejercicio', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Superserie'));
        expect(screen.getByText('SUPERSET')).toBeInTheDocument();
        fireEvent.click(screen.getByText(/Añadir Ejercicio/));
        expect(screen.getAllByPlaceholderText('Ejercicio')).toHaveLength(2);
    });

    it('escribir el nombre de un ejercicio actualiza SOLO ese ejercicio (no sus hermanos)', async () => {
        render(<AdminDashboard />);
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
        render(<AdminDashboard />);
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
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'FEDE' } });
        expect(screen.getByText(/Federico Gómez/)).toBeInTheDocument();
        expect(screen.queryByText(/Ana Pérez/)).not.toBeInTheDocument();
    });

    it('seleccionar un resultado carga el alumno en el plan y limpia la búsqueda', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Federico Gómez', email: 'f@x.com', telefono: '111' }]);
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Fede' } });
        fireEvent.click(screen.getByText(/Federico Gómez/));
        expect(screen.getByText(/Asignado a:/).parentElement).toHaveTextContent('Federico Gómez');
    });

    it('BUG: el alumno tiene `telefono` pero AdminDashboard lo guarda como `celular` (nunca existe esa propiedad)', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Federico Gómez', email: 'f@x.com', telefono: '1122334455' }]);
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Fede' } });
        fireEvent.click(screen.getByText(/Federico Gómez/));
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan X' } });
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        await waitFor(() => expect(screen.getByText(/Verifica los detalles/)).toBeInTheDocument());
        fireEvent.click(screen.getByText('¡Publicar ahora!'));
        await waitFor(() => expect(publicarPlanMock).toHaveBeenCalled());
        // El link de WhatsApp que se arma después de publicar cae al genérico
        // (sin número) porque plan.celular quedó undefined — nunca se leyó
        // `a.telefono`, que es el nombre real del campo.
        const linkWa = await screen.findByText(/Avisar ahora/);
        expect(linkWa.closest('a').href).toBe('https://wa.me/?text=' + encodeURIComponent(
            `¡Hola Federico Gómez! 🏋️‍♂️ Ya te subí tu nueva rutina: *Plan X* (4 semanas). ¡Entra a la app para verla! 🔥`
        ));
    });
});

describe('AdminDashboard — publicar y guardar plantilla', () => {
    it('"Publicar a Alumno" sin haber elegido alumno muestra error y no abre el modal', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        expect(await screen.findByText(/selecciona un alumno primero/i)).toBeInTheDocument();
        expect(screen.queryByText('¡Publicar ahora!')).not.toBeInTheDocument();
    });

    it('"Guardar Plantilla" sin título muestra error y no llama al servicio', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        expect(await screen.findByText(/ponerle un título/i)).toBeInTheDocument();
        expect(guardarPlantillaMock).not.toHaveBeenCalled();
    });

    it('guardar plantilla con título llama al servicio y refresca la lista de plantillas', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Mi Plantilla' } });
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        await waitFor(() => expect(guardarPlantillaMock).toHaveBeenCalled());
        expect(getPlantillasMock).toHaveBeenCalledTimes(2); // 1 al montar + 1 al refrescar
    });

    it('bloques sin ningún ejercicio se filtran antes de guardar la plantilla', async () => {
        render(<AdminDashboard />);
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
        render(<AdminDashboard />);
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
        render(<AdminDashboard />);
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
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByDisplayValue('Cargar Plantilla...'), { target: { value: 'p1' } });
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plantilla Fuerza');
        expect(screen.getByDisplayValue('Empuje')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Día 1')).not.toBeInTheDocument();
    });
});

describe('AdminDashboard — persistencia del borrador (arreglo del bug reportado por un cliente real)', () => {
    it('escribir en el plan lo guarda en localStorage al toque', async () => {
        render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan Sin Terminar' } });
        await waitFor(() => {
            const guardado = JSON.parse(localStorage.getItem('ffit_admin_plan_draft_anon'));
            expect(guardado.titulo).toBe('Plan Sin Terminar');
        });
    });

    it('desmontar la pantalla (simula navegar a otra pestaña) y volver a montarla recupera el borrador tal cual quedó', async () => {
        const { unmount } = render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan A Medio Hacer' } });
        fireEvent.click(screen.getByText('Serie'));
        fireEvent.change(screen.getByPlaceholderText('Ejercicio'), { target: { value: 'Sentadilla' } });
        await waitFor(() => expect(JSON.parse(localStorage.getItem('ffit_admin_plan_draft_anon')).titulo).toBe('Plan A Medio Hacer'));

        // Esto es exactamente lo que le pasaba al cliente: se desmonta el
        // componente (como al navegar a "Alumnos" o "Seguimiento") y se
        // vuelve a montar (como al volver a "Planes").
        unmount();
        render(<AdminDashboard />);
        await esperarCargaInicial();

        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plan A Medio Hacer');
        expect(screen.getByDisplayValue('Sentadilla')).toBeInTheDocument();
    });

    it('un F5 (recargar la página) también se comporta como un remount que recupera el borrador', async () => {
        // jsdom no tiene un F5 real, pero un refresh de página ES, para
        // React, exactamente esto: el árbol entero se desmonta y se vuelve
        // a montar desde cero con un `render` nuevo.
        const { unmount } = render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Sobrevive al F5' } });
        await waitFor(() => expect(localStorage.getItem('ffit_admin_plan_draft_anon')).toContain('Sobrevive al F5'));
        unmount();

        render(<AdminDashboard />);
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Sobrevive al F5');
    });

    it('publicar con éxito borra el borrador — un remount posterior arranca en blanco, no con el plan ya publicado', async () => {
        getStudentsMock.mockResolvedValue([{ _id: 'a1', nombre: 'Ana', email: 'a@x.com' }]);
        const { unmount } = render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/Buscar alumno/), { target: { value: 'Ana' } });
        fireEvent.click(screen.getByText(/Ana/));
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plan Ya Publicado' } });
        fireEvent.click(screen.getByText('Publicar a Alumno'));
        fireEvent.click(await screen.findByText('¡Publicar ahora!'));
        await waitFor(() => expect(publicarPlanMock).toHaveBeenCalled());

        expect(localStorage.getItem('ffit_admin_plan_draft_anon')).toBeNull();

        unmount();
        render(<AdminDashboard />);
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('');
    });

    it('guardar como plantilla NO borra el borrador (el profe puede seguir editando el mismo plan después)', async () => {
        const { unmount } = render(<AdminDashboard />);
        await esperarCargaInicial();
        fireEvent.change(screen.getByPlaceholderText(/TÍTULO/), { target: { value: 'Plantilla En Progreso' } });
        fireEvent.click(screen.getByText('Guardar Plantilla'));
        await waitFor(() => expect(guardarPlantillaMock).toHaveBeenCalled());

        unmount();
        render(<AdminDashboard />);
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('Plantilla En Progreso');
    });

    it('un borrador con JSON corrupto en localStorage no rompe la pantalla — arranca en blanco', async () => {
        localStorage.setItem('ffit_admin_plan_draft_anon', '{esto no es JSON válido');
        expect(() => render(<AdminDashboard />)).not.toThrow();
        await esperarCargaInicial();
        expect(screen.getByPlaceholderText(/TÍTULO/)).toHaveValue('');
    });
});
