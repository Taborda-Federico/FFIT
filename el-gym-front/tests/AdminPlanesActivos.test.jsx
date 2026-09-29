import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminPlanesActivos } from '../src/feactures/Admin/pages/AdminPlanesActivos';

const { getPlanesActivosMock, navigateMock, authValue } = vi.hoisted(() => ({
    getPlanesActivosMock: vi.fn(),
    navigateMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));

vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/plan.service', () => ({ PlanService: { getPlanesActivos: getPlanesActivosMock } }));
// El componente solo usa useNavigate de react-router-dom (no hace falta un
// <Router> real alrededor para probarlo).
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

function planes(overrides = []) {
    return overrides.length ? overrides : [
        {
            _id: 'plan1', titulo: 'Fuerza Nivel 1', vencimiento: 2,
            alumnoId: { _id: 'a1', nombre: 'Federico Gómez' },
            sesiones: [
                { _id: 's1', nombre: 'Día 1', bloques: [{ _id: 'b1', tipo: 'standard', ejercicios: [{ _id: 'e1', nombre: 'Sentadilla', series: '4', reps: '10' }] }] },
                { _id: 's2', nombre: 'Día 2', bloques: [] },
            ]
        },
        {
            _id: 'plan2', titulo: 'Cardio Express', vencimiento: 4,
            alumnoId: { _id: 'a2', nombre: 'Ana Pérez' },
            sesiones: [{ _id: 's3', nombre: 'Día 1', bloques: [{ _id: 'b2', tipo: 'circuit', ejercicios: [{ _id: 'e2', nombre: 'Burpees', tiempo: '30' }] }] }]
        },
    ];
}

beforeEach(() => {
    getPlanesActivosMock.mockReset().mockResolvedValue([]);
    navigateMock.mockReset();
});

async function esperarCarga() {
    await waitFor(() => expect(getPlanesActivosMock).toHaveBeenCalled());
}

describe('AdminPlanesActivos — lista y búsqueda', () => {
    it('lista todos los planes activos, con alumno, título, días y semanas restantes', async () => {
        getPlanesActivosMock.mockResolvedValue(planes());
        render(<AdminPlanesActivos />);
        await esperarCarga();
        expect(screen.getByText('Fuerza Nivel 1')).toBeInTheDocument();
        expect(screen.getByText(/Federico Gómez/)).toBeInTheDocument();
        expect(screen.getByText(/2 días.*2 semanas restantes/)).toBeInTheDocument();
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.getByText(/1 día(?!s)/)).toBeInTheDocument(); // singular
    });

    it('mientras carga, muestra un estado de carga', () => {
        getPlanesActivosMock.mockReturnValue(new Promise(() => { })); // nunca resuelve
        render(<AdminPlanesActivos />);
        expect(screen.getByText(/Cargando planes activos/i)).toBeInTheDocument();
    });

    it('sin ningún plan activo, muestra el estado vacío', async () => {
        getPlanesActivosMock.mockResolvedValue([]);
        render(<AdminPlanesActivos />);
        await esperarCarga();
        expect(await screen.findByText(/Todavía no hay ningún plan activo asignado/i)).toBeInTheDocument();
    });

    it('la búsqueda filtra por alumno O por título, sin importar mayúsculas', async () => {
        getPlanesActivosMock.mockResolvedValue(planes());
        render(<AdminPlanesActivos />);
        await esperarCarga();

        fireEvent.change(screen.getByPlaceholderText(/Buscar por alumno o título/), { target: { value: 'ana' } });
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.queryByText('Fuerza Nivel 1')).not.toBeInTheDocument();
    });

    it('búsqueda sin resultados muestra el estado de "sin resultados" (distinto del de lista vacía)', async () => {
        getPlanesActivosMock.mockResolvedValue(planes());
        render(<AdminPlanesActivos />);
        await esperarCarga();
        fireEvent.change(screen.getByPlaceholderText(/Buscar por alumno o título/), { target: { value: 'zzz-no-existe' } });
        expect(screen.getByText(/No se encontraron resultados para "zzz-no-existe"/i)).toBeInTheDocument();
        expect(screen.queryByText(/Todavía no hay ningún plan activo/i)).not.toBeInTheDocument();
    });

    it('un plan sin alumnoId (alumno borrado) no crashea, muestra "Alumno eliminado"', async () => {
        getPlanesActivosMock.mockResolvedValue([{ _id: 'p', titulo: 'Huérfano', vencimiento: 2, alumnoId: null, sesiones: [] }]);
        render(<AdminPlanesActivos />);
        await esperarCarga();
        expect(screen.getByText('Huérfano')).toBeInTheDocument();
        expect(screen.getByText(/Alumno eliminado/)).toBeInTheDocument();
    });
});

describe('AdminPlanesActivos — ver un plan "en grande"', () => {
    it('clickear una tarjeta reemplaza la lista por el detalle grande del plan, con todas sus sesiones/bloques/ejercicios', async () => {
        getPlanesActivosMock.mockResolvedValue(planes());
        render(<AdminPlanesActivos />);
        await esperarCarga();

        fireEvent.click(screen.getByText('Fuerza Nivel 1'));

        // Ya no se ve la lista (la tarjeta de "Cardio Express" desaparece).
        expect(screen.queryByText('Cardio Express')).not.toBeInTheDocument();
        // El plan elegido se ve completo, en grande.
        expect(screen.getByRole('heading', { name: 'Fuerza Nivel 1' })).toBeInTheDocument();
        expect(screen.getByText('Sentadilla')).toBeInTheDocument();
        expect(screen.getByText(/Día 2/)).toBeInTheDocument();
        expect(screen.getByText(/Sin bloques cargados/)).toBeInTheDocument(); // Día 2 no tiene bloques
    });

    it('"Volver a la lista" regresa a la lista completa', async () => {
        getPlanesActivosMock.mockResolvedValue(planes());
        render(<AdminPlanesActivos />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Fuerza Nivel 1'));
        fireEvent.click(screen.getByText(/Volver a la lista/));

        expect(screen.getByText('Fuerza Nivel 1')).toBeInTheDocument();
        expect(screen.getByText('Cardio Express')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Fuerza Nivel 1' })).not.toBeInTheDocument();
    });

    it('el botón "Editar" del detalle grande navega a /admin/planes con el plan completo en el state', async () => {
        const data = planes();
        getPlanesActivosMock.mockResolvedValue(data);
        render(<AdminPlanesActivos />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Fuerza Nivel 1'));
        fireEvent.click(screen.getByRole('button', { name: /Editar/ }));

        expect(navigateMock).toHaveBeenCalledWith('/admin/planes', { state: { planParaEditar: data[0] } });
    });
});
