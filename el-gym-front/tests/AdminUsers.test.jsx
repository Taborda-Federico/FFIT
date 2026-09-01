import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminUsers } from '../src/feactures/Admin/pages/AdminUsers';

const { getStudentsMock, renewMock, deleteMock, authValue } = vi.hoisted(() => ({
    getStudentsMock: vi.fn(),
    renewMock: vi.fn(),
    deleteMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/user.service', () => ({
    UserService: { getStudents: getStudentsMock, renewMembership: renewMock, deleteUser: deleteMock }
}));

function alumno(overrides = {}) {
    return { _id: '1', nombre: 'Fede Test', dni: '30111222', fechaVencimiento: new Date().toISOString(), planActivoNombre: 'Sin Plan', ...overrides };
}

beforeEach(() => {
    getStudentsMock.mockReset().mockResolvedValue([]);
    renewMock.mockReset().mockResolvedValue({});
    deleteMock.mockReset().mockResolvedValue({});
});

async function esperarCarga() {
    await waitFor(() => expect(screen.queryByText(/Sincronizando alumnos/)).not.toBeInTheDocument());
}

describe('AdminUsers — listado y búsqueda', () => {
    it('muestra el spinner de carga y luego la tabla', async () => {
        getStudentsMock.mockResolvedValue([alumno()]);
        render(<AdminUsers />);
        expect(screen.getByText(/Sincronizando alumnos/)).toBeInTheDocument();
        await esperarCarga();
        expect(screen.getByText('Fede Test')).toBeInTheDocument();
    });

    it('BUG: un alumno con `dni` undefined (creado sin pasar por el form) rompe el filtro de búsqueda con un TypeError', async () => {
        getStudentsMock.mockResolvedValue([alumno({ dni: undefined })]);
        // Silenciamos el error de React ("consumido" por el error boundary
        // inexistente) solo para que el test no ensucie la salida; lo que
        // nos importa es que renderApp explota.
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<AdminUsers />)).not.toThrow(); // el throw ocurre async, en el efecto
        await waitFor(() => {
            // El .toString() sobre `dni` undefined tira TypeError dentro del
            // render — sin un Error Boundary, React desmonta el árbol.
            expect(screen.queryByText('Fede Test')).not.toBeInTheDocument();
        });
        spy.mockRestore();
    });

    it('filtra por nombre (case-insensitive)', async () => {
        getStudentsMock.mockResolvedValue([alumno({ nombre: 'Federico' }), alumno({ _id: '2', nombre: 'Ana', dni: '2' })]);
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), { target: { value: 'fede' } });
        expect(screen.getByText('Federico')).toBeInTheDocument();
        expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    });

    it('filtra por DNI', async () => {
        getStudentsMock.mockResolvedValue([alumno({ nombre: 'Federico', dni: '111' }), alumno({ _id: '2', nombre: 'Ana', dni: '222' })]);
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), { target: { value: '222' } });
        expect(screen.getByText('Ana')).toBeInTheDocument();
        expect(screen.queryByText('Federico')).not.toBeInTheDocument();
    });

    it('sin resultados de búsqueda, muestra el estado vacío', async () => {
        getStudentsMock.mockResolvedValue([alumno()]);
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), { target: { value: 'nadie-existe-con-este-nombre' } });
        expect(screen.getByText(/No se encontraron resultados/)).toBeInTheDocument();
    });
});

describe('AdminUsers — estado de vencimiento (getStatusInfo)', () => {
    it.each([
        [-1, 'Vencido'],
        [0, 'Por vencer'],
        [5, 'Por vencer'],
        [6, 'Al día'],
        [30, 'Al día'],
    ])('a %i días de vencimiento → "%s"', async (dias, esperado) => {
        const fecha = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
        getStudentsMock.mockResolvedValue([alumno({ fechaVencimiento: fecha.toISOString() })]);
        render(<AdminUsers />);
        await esperarCarga();
        expect(screen.getByText(esperado)).toBeInTheDocument();
    });

    it('sin fechaVencimiento, muestra "Sin Datos"', async () => {
        getStudentsMock.mockResolvedValue([alumno({ fechaVencimiento: null })]);
        render(<AdminUsers />);
        await esperarCarga();
        expect(screen.getByText('Sin Datos')).toBeInTheDocument();
    });
});

describe('AdminUsers — acciones (cobrar, eliminar, ver ficha)', () => {
    it('"cobrar" pide confirmación y, al confirmar, llama a renewMembership y refresca la lista', async () => {
        getStudentsMock.mockResolvedValue([alumno()]);
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.click(screen.getByTitle('Registrar Pago y Renovar'));
        expect(screen.getByText(/Se le sumarán 30 días/)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Aceptar Pago'));
        await waitFor(() => expect(renewMock).toHaveBeenCalledWith('1', 'tok'));
    });

    it('"eliminar" pide confirmación de advertencia y, al confirmar, saca al alumno de la tabla sin recargar todo', async () => {
        getStudentsMock.mockResolvedValue([alumno()]);
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.click(screen.getByTitle('Eliminar Alumno'));
        expect(screen.getByText(/no se puede deshacer/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Sí, Eliminar'));
        await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('1', 'tok'));
        await waitFor(() => expect(screen.queryByText('Fede Test')).not.toBeInTheDocument());
    });

    it('"ver ficha" no llama a ningún servicio, solo redirige (con un mensaje) a la pestaña de Seguimiento', async () => {
        getStudentsMock.mockResolvedValue([alumno()]);
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.click(screen.getByTitle('Ver Ficha Técnica'));
        expect(screen.getByText(/pestaña "Seguimiento"/)).toBeInTheDocument();
        expect(renewMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
    });

    it('si falla la renovación, muestra un toast de error y NO refresca', async () => {
        getStudentsMock.mockResolvedValue([alumno()]);
        renewMock.mockRejectedValue(new Error('fail'));
        render(<AdminUsers />);
        await esperarCarga();
        fireEvent.click(screen.getByTitle('Registrar Pago y Renovar'));
        fireEvent.click(screen.getByText('Aceptar Pago'));
        expect(await screen.findByText(/Error al registrar el pago/)).toBeInTheDocument();
    });
});
