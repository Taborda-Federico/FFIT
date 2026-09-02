import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfileView } from '../src/feactures/User/ProfileView';

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn() }));
vi.mock('../src/contex/AuthContext', () => ({
    useAuth: () => ({ user: { token: 'tok' }, logout: logoutMock })
}));
vi.mock('../src/service/student.service', () => ({
    StudentService: { changePassword: vi.fn() }
}));

function userData(overrides = {}) {
    return {
        user: {
            nombre: 'Fede', email: 'fede@x.com', dni: '30111222', peso: 80, altura: 178,
            fechaIngreso: '2025-01-15T00:00:00', fechaVencimiento: '2026-02-01T00:00:00',
            diasRestantes: 10, estado: 'ACTIVO',
            ...overrides.user
        },
        stats: { sesionesCompletadas: 5, ...overrides.stats }
    };
}

describe('ProfileView — casos límite de datos', () => {
    it('sin userData, no renderiza nada (return null) en vez de crashear', () => {
        const { container } = render(<ProfileView userData={null} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('con userData pero sin la clave `user`, tampoco crashea', () => {
        const { container } = render(<ProfileView userData={{}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('campos ausentes (peso, altura) muestran "---" en vez de "undefined" o "null kg"', () => {
        render(<ProfileView userData={userData({ user: { nombre: 'X', peso: undefined, altura: undefined, estado: 'ACTIVO', diasRestantes: 1 } })} />);
        const guiones = screen.getAllByText('---');
        expect(guiones.length).toBeGreaterThan(0);
    });

    it('estado ACTIVO muestra "SOCIO ACTIVO" en dorado/verde', () => {
        render(<ProfileView userData={userData()} />);
        expect(screen.getByText('SOCIO ACTIVO')).toBeInTheDocument();
    });

    it('estado VENCIDO muestra "SOCIO VENCIDO"', () => {
        render(<ProfileView userData={userData({ user: { nombre: 'X', estado: 'VENCIDO', diasRestantes: 0 } })} />);
        expect(screen.getByText('SOCIO VENCIDO')).toBeInTheDocument();
    });
});

describe('ProfileView — cambio de contraseña', () => {
    it('valida que las contraseñas nuevas coincidan antes de llamar al servicio', async () => {
        const { StudentService } = await import('../src/service/student.service');
        render(<ProfileView userData={userData()} />);
        fireEvent.click(screen.getByText(/Configurar Contraseña/));
        fireEvent.change(screen.getByPlaceholderText(/Contraseña Actual/), { target: { value: 'vieja' } });
        fireEvent.change(screen.getByPlaceholderText('Nueva Contraseña'), { target: { value: 'nueva1' } });
        fireEvent.change(screen.getByPlaceholderText('Repetir Nueva Contraseña'), { target: { value: 'nueva2' } });
        fireEvent.click(screen.getByText('Guardar Cambios'));
        expect(await screen.findByText(/no coinciden/i)).toBeInTheDocument();
        expect(StudentService.changePassword).not.toHaveBeenCalled();
    });

    it('valida un mínimo de 6 caracteres ANTES de llamar al servicio (guardia solo client-side)', async () => {
        const { StudentService } = await import('../src/service/student.service');
        render(<ProfileView userData={userData()} />);
        fireEvent.click(screen.getByText(/Configurar Contraseña/));
        fireEvent.change(screen.getByPlaceholderText(/Contraseña Actual/), { target: { value: 'vieja' } });
        fireEvent.change(screen.getByPlaceholderText('Nueva Contraseña'), { target: { value: 'abc' } });
        fireEvent.change(screen.getByPlaceholderText('Repetir Nueva Contraseña'), { target: { value: 'abc' } });
        fireEvent.click(screen.getByText('Guardar Cambios'));
        expect(await screen.findByText(/al menos 6 caracteres/i)).toBeInTheDocument();
        expect(StudentService.changePassword).not.toHaveBeenCalled();
    });

    it('con datos válidos, llama al servicio y muestra éxito', async () => {
        const { StudentService } = await import('../src/service/student.service');
        StudentService.changePassword.mockResolvedValue({ message: 'ok' });
        render(<ProfileView userData={userData()} />);
        fireEvent.click(screen.getByText(/Configurar Contraseña/));
        fireEvent.change(screen.getByPlaceholderText(/Contraseña Actual/), { target: { value: 'vieja123' } });
        fireEvent.change(screen.getByPlaceholderText('Nueva Contraseña'), { target: { value: 'nueva123' } });
        fireEvent.change(screen.getByPlaceholderText('Repetir Nueva Contraseña'), { target: { value: 'nueva123' } });
        fireEvent.click(screen.getByText('Guardar Cambios'));
        expect(await screen.findByText(/actualizada con éxito/i)).toBeInTheDocument();
        expect(StudentService.changePassword).toHaveBeenCalledWith('vieja123', 'nueva123', 'tok');
    });

    it('muestra el error que devuelve el servicio si falla (ej. contraseña actual incorrecta)', async () => {
        const { StudentService } = await import('../src/service/student.service');
        StudentService.changePassword.mockRejectedValue(new Error('La contraseña actual es incorrecta'));
        render(<ProfileView userData={userData()} />);
        fireEvent.click(screen.getByText(/Configurar Contraseña/));
        fireEvent.change(screen.getByPlaceholderText(/Contraseña Actual/), { target: { value: 'mala' } });
        fireEvent.change(screen.getByPlaceholderText('Nueva Contraseña'), { target: { value: 'nueva123' } });
        fireEvent.change(screen.getByPlaceholderText('Repetir Nueva Contraseña'), { target: { value: 'nueva123' } });
        fireEvent.click(screen.getByText('Guardar Cambios'));
        expect(await screen.findByText('La contraseña actual es incorrecta')).toBeInTheDocument();
    });
});

describe('ProfileView — logout', () => {
    it('el botón de cerrar sesión llama a logout() del contexto', () => {
        render(<ProfileView userData={userData()} />);
        fireEvent.click(screen.getByText(/CERRAR SESIÓN/));
        expect(logoutMock).toHaveBeenCalledTimes(1);
    });
});
