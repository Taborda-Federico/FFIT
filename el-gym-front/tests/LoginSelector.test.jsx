import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginSelector } from '../src/feactures/gym-main/Comoponents/LoginSelector/LoginSelector';

const { loginServiceMock, navigateMock, loginContextMock } = vi.hoisted(() => ({
    loginServiceMock: vi.fn(),
    navigateMock: vi.fn(),
    loginContextMock: vi.fn(),
}));
vi.mock('../src/service/auth.service', () => ({ AuthService: { login: loginServiceMock } }));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => ({ login: loginContextMock }) }));
vi.mock('react-router-dom', async () => {
    const real = await vi.importActual('react-router-dom');
    return { ...real, useNavigate: () => navigateMock };
});

beforeEach(() => {
    loginServiceMock.mockReset();
    navigateMock.mockReset();
    loginContextMock.mockReset();
});

function irALoginAdmin() {
    render(<MemoryRouter><LoginSelector onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Staff Admin'));
}

describe('LoginSelector', () => {
    it('pantalla inicial ofrece los dos perfiles: Staff Admin y Alumno', () => {
        render(<MemoryRouter><LoginSelector onClose={() => {}} /></MemoryRouter>);
        expect(screen.getByText('Staff Admin')).toBeInTheDocument();
        expect(screen.getByText('Alumno')).toBeInTheDocument();
    });

    it('"Volver" regresa del formulario a la selección de perfil', () => {
        irALoginAdmin();
        expect(screen.getByText(/Acceso/)).toBeInTheDocument();
        fireEvent.click(screen.getByText(/Volver/));
        expect(screen.getByText('Staff Admin')).toBeInTheDocument();
    });

    it('login exitoso como admin navega a /admin, guarda la sesión y cierra el modal', async () => {
        loginServiceMock.mockResolvedValue({ _id: '1', nombre: 'X', role: 'admin', token: 'tok' });
        const onClose = vi.fn();
        render(<MemoryRouter><LoginSelector onClose={onClose} /></MemoryRouter>);
        fireEvent.click(screen.getByText('Staff Admin'));
        fireEvent.change(screen.getByPlaceholderText('Correo Electrónico'), { target: { value: 'a@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('INICIAR SESIÓN'));
        await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/admin'));
        expect(loginContextMock).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('login exitoso como alumno navega a /user', async () => {
        loginServiceMock.mockResolvedValue({ _id: '1', nombre: 'X', role: 'user', token: 'tok' });
        render(<MemoryRouter><LoginSelector onClose={() => {}} /></MemoryRouter>);
        fireEvent.click(screen.getByText('Alumno'));
        fireEvent.change(screen.getByPlaceholderText('Correo Electrónico'), { target: { value: 'a@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('INICIAR SESIÓN'));
        await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/user'));
    });

    it('credenciales de ALUMNO usadas en el portal de Staff Admin: el backend autentica bien, pero el frontend bloquea con un mensaje claro (guarda de rol solo client-side)', async () => {
        loginServiceMock.mockResolvedValue({ _id: '1', nombre: 'X', role: 'user', token: 'tok-valido' });
        irALoginAdmin();
        fireEvent.change(screen.getByPlaceholderText('Correo Electrónico'), { target: { value: 'alumno@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('INICIAR SESIÓN'));
        expect(await screen.findByText(/no tiene permisos de admin/i)).toBeInTheDocument();
        // Punto clave: como el rechazo es solo de UI, el login() del contexto
        // NUNCA se llama con ese token — no queda "medio logueado".
        expect(loginContextMock).not.toHaveBeenCalled();
        expect(navigateMock).not.toHaveBeenCalled();
    });

    it('credenciales incorrectas muestran el mensaje de error del backend', async () => {
        loginServiceMock.mockRejectedValue(new Error('Email o contraseña incorrectos'));
        irALoginAdmin();
        fireEvent.change(screen.getByPlaceholderText('Correo Electrónico'), { target: { value: 'x@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'mala' } });
        fireEvent.click(screen.getByText('INICIAR SESIÓN'));
        expect(await screen.findByText('Email o contraseña incorrectos')).toBeInTheDocument();
    });

    it('mientras está cargando, el botón muestra "Cargando..." y no se puede reenviar', async () => {
        let resolver;
        loginServiceMock.mockReturnValue(new Promise(r => { resolver = r; }));
        irALoginAdmin();
        fireEvent.change(screen.getByPlaceholderText('Correo Electrónico'), { target: { value: 'x@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña'), { target: { value: 'y' } });
        fireEvent.click(screen.getByText('INICIAR SESIÓN'));
        expect(await screen.findByText('Cargando...')).toBeInTheDocument();
        resolver({ role: 'admin', token: 'x' });
    });
});
