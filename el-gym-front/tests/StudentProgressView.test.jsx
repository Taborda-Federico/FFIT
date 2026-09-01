import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentProgressView } from '../src/feactures/Admin/pages/StudentProgressView';

const { getStudentsMock, getStudentProgressMock, createNoteMock, authValue } = vi.hoisted(() => ({
    getStudentsMock: vi.fn(),
    getStudentProgressMock: vi.fn(),
    createNoteMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/user.service', () => ({ UserService: { getStudents: getStudentsMock } }));
vi.mock('../src/service/admin.service', () => ({
    AdminService: { getStudentProgress: getStudentProgressMock, createNote: createNoteMock }
}));

beforeEach(() => {
    getStudentsMock.mockReset().mockResolvedValue([{ _id: 's1', nombre: 'Fede Test', dni: '111' }]);
    getStudentProgressMock.mockReset();
    createNoteMock.mockReset();
});

async function buscarYSeleccionarAlumno() {
    render(<StudentProgressView />);
    await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
    fireEvent.change(screen.getByPlaceholderText(/Escribe nombre o DNI/), { target: { value: 'Fede' } });
    fireEvent.click(screen.getByText('Fede Test'));
    await waitFor(() => expect(getStudentProgressMock).toHaveBeenCalled());
}

describe('StudentProgressView — búsqueda', () => {
    it('sin texto de búsqueda, no muestra resultados', async () => {
        render(<StudentProgressView />);
        await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
        expect(screen.queryByText('Fede Test')).not.toBeInTheDocument();
    });

    it('limita los resultados de búsqueda a 5', async () => {
        getStudentsMock.mockResolvedValue(Array.from({ length: 8 }, (_, i) => ({ _id: `s${i}`, nombre: `Alumno ${i}`, dni: `${i}` })));
        render(<StudentProgressView />);
        await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
        fireEvent.change(screen.getByPlaceholderText(/Escribe nombre o DNI/), { target: { value: 'Alumno' } });
        expect(screen.getAllByText(/Alumno \d/)).toHaveLength(5);
    });

    it('estado inicial (sin alumno seleccionado) muestra el placeholder "Monitor de Alto Rendimiento"', async () => {
        render(<StudentProgressView />);
        await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
        expect(screen.getByText(/Monitor de Alto Rendimiento/)).toBeInTheDocument();
    });
});

describe('StudentProgressView — ficha del alumno seleccionado', () => {
    it('al seleccionar, carga el progreso y arma la lista de ejercicios únicos, ordenada alfabéticamente', async () => {
        getStudentProgressMock.mockResolvedValue({
            historial: [
                { _id: 'h1', nombreSesion: 'Día 1', createdAt: '2026-01-01', ejercicios: [{ nombre: 'Sentadilla', pesoUsado: 80 }, { nombre: 'Curl', pesoUsado: 15 }] }
            ],
            notas: []
        });
        await buscarYSeleccionarAlumno();
        const select = screen.getByDisplayValue('Curl'); // el primero alfabéticamente
        expect(select).toBeInTheDocument();
    });

    it('el gráfico ignora registros con pesoUsado 0 o ausente', async () => {
        getStudentProgressMock.mockResolvedValue({
            historial: [
                { _id: 'h1', nombreSesion: 'D1', createdAt: '2026-01-01', ejercicios: [{ nombre: 'Press', pesoUsado: 0 }] },
                { _id: 'h2', nombreSesion: 'D2', createdAt: '2026-01-02', ejercicios: [{ nombre: 'Press', pesoUsado: 50 }] },
            ],
            notas: []
        });
        await buscarYSeleccionarAlumno();
        expect(screen.getByText('50 kg')).toBeInTheDocument();
        expect(screen.getByText(/RÉCORD ACTUAL/).parentElement).toHaveTextContent('50 kg');
    });

    it('sin ningún ejercicio con peso registrado, muestra el mensaje correspondiente', async () => {
        getStudentProgressMock.mockResolvedValue({ historial: [], notas: [] });
        await buscarYSeleccionarAlumno();
        expect(screen.getByText(/aún no ha registrado pesos/i)).toBeInTheDocument();
    });

    it('"Cambiar Alumno" vuelve al estado de búsqueda', async () => {
        getStudentProgressMock.mockResolvedValue({ historial: [], notas: [] });
        await buscarYSeleccionarAlumno();
        fireEvent.click(screen.getByText('Cambiar Alumno'));
        expect(screen.getByText(/Monitor de Alto Rendimiento/)).toBeInTheDocument();
    });

    it('si falla la carga del progreso, muestra un toast de error', async () => {
        getStudentProgressMock.mockRejectedValue(new Error('fail'));
        render(<StudentProgressView />);
        await waitFor(() => expect(getStudentsMock).toHaveBeenCalled());
        fireEvent.change(screen.getByPlaceholderText(/Escribe nombre o DNI/), { target: { value: 'Fede' } });
        fireEvent.click(screen.getByText('Fede Test'));
        expect(await screen.findByText(/Error al cargar la ficha/)).toBeInTheDocument();
    });
});

describe('StudentProgressView — notas del profesor', () => {
    it('una nota vacía o de solo espacios no se envía', async () => {
        getStudentProgressMock.mockResolvedValue({ historial: [], notas: [] });
        await buscarYSeleccionarAlumno();
        fireEvent.change(screen.getByPlaceholderText(/recomendaciones técnicas/), { target: { value: '   ' } });
        fireEvent.click(screen.getByText('Guardar Nota'));
        expect(createNoteMock).not.toHaveBeenCalled();
    });

    it('con contenido, llama a createNote, la antepone a la lista y limpia el textarea', async () => {
        getStudentProgressMock.mockResolvedValue({ historial: [], notas: [{ _id: 'n0', contenido: 'Vieja', fecha: '2026-01-01' }] });
        createNoteMock.mockResolvedValue({ _id: 'n1', contenido: 'Nueva nota', fecha: '2026-01-02' });
        await buscarYSeleccionarAlumno();
        fireEvent.change(screen.getByPlaceholderText(/recomendaciones técnicas/), { target: { value: 'Nueva nota' } });
        fireEvent.click(screen.getByText('Guardar Nota'));
        await waitFor(() => expect(createNoteMock).toHaveBeenCalledWith({ alumnoId: 's1', contenido: 'Nueva nota' }, 'tok'));
        expect(await screen.findByText('Nueva nota')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/recomendaciones técnicas/)).toHaveValue('');
    });
});
