import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateAdminModal } from '../src/feactures/Admin/components/CreateAdminModal';

const { createAdminMock, authValue } = vi.hoisted(() => ({
    createAdminMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/admin.service', () => ({ AdminService: { createAdmin: createAdminMock } }));

beforeEach(() => { createAdminMock.mockReset(); });

describe('CreateAdminModal', () => {
    it('se renderiza en un portal, como hijo directo de document.body (no del árbol normal de React)', () => {
        const { container } = render(<div id="app-root"><CreateAdminModal onClose={() => {}} onSuccess={() => {}} onError={() => {}} /></div>);
        // El contenido del modal NO debe estar dentro de #app-root...
        expect(container.querySelector('.admin-modal-overlay')).toBeNull();
        // ...sino directamente en document.body.
        expect(document.body.querySelector('.admin-modal-overlay')).not.toBeNull();
    });

    it('los inputs NO tienen el atributo HTML `required` — la validación es 100% manual en JS', () => {
        render(<CreateAdminModal onClose={() => {}} onSuccess={() => {}} onError={() => {}} />);
        expect(screen.getByPlaceholderText('Nombre completo')).not.toBeRequired();
        expect(screen.getByPlaceholderText('Correo electrónico')).not.toBeRequired();
        expect(screen.getByPlaceholderText('Contraseña provisoria')).not.toBeRequired();
    });

    it('campos vacíos → onError, no llama al servicio', () => {
        const onError = vi.fn();
        render(<CreateAdminModal onClose={() => {}} onSuccess={() => {}} onError={onError} />);
        fireEvent.click(screen.getByText('Crear Admin'));
        expect(onError).toHaveBeenCalledWith('Todos los campos son obligatorios.');
        expect(createAdminMock).not.toHaveBeenCalled();
    });

    it('BUG MENOR: un nombre de solo espacios ("   ") pasa la validación manual (no usa .trim())', () => {
        const onError = vi.fn();
        createAdminMock.mockResolvedValue({});
        render(<CreateAdminModal onClose={() => {}} onSuccess={() => {}} onError={onError} />);
        fireEvent.change(screen.getByPlaceholderText('Nombre completo'), { target: { value: '   ' } });
        fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'x@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña provisoria'), { target: { value: 'pass123' } });
        fireEvent.click(screen.getByText('Crear Admin'));
        expect(onError).not.toHaveBeenCalledWith('Todos los campos son obligatorios.');
        expect(createAdminMock).toHaveBeenCalled();
    });

    it('camino feliz: llama al servicio, dispara onSuccess y onClose', async () => {
        const onSuccess = vi.fn();
        const onClose = vi.fn();
        createAdminMock.mockResolvedValue({});
        render(<CreateAdminModal onClose={onClose} onSuccess={onSuccess} onError={() => {}} />);
        fireEvent.change(screen.getByPlaceholderText('Nombre completo'), { target: { value: 'Nuevo Coach' } });
        fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'coach@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña provisoria'), { target: { value: 'pass123' } });
        fireEvent.click(screen.getByText('Crear Admin'));
        await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(expect.stringContaining('Nuevo Coach')));
        expect(onClose).toHaveBeenCalled();
    });

    it('si el servicio falla, llama a onError con el mensaje devuelto', async () => {
        const onError = vi.fn();
        createAdminMock.mockRejectedValue(new Error('El usuario ya existe'));
        render(<CreateAdminModal onClose={() => {}} onSuccess={() => {}} onError={onError} />);
        fireEvent.change(screen.getByPlaceholderText('Nombre completo'), { target: { value: 'X' } });
        fireEvent.change(screen.getByPlaceholderText('Correo electrónico'), { target: { value: 'x@x.com' } });
        fireEvent.change(screen.getByPlaceholderText('Contraseña provisoria'), { target: { value: 'pass123' } });
        fireEvent.click(screen.getByText('Crear Admin'));
        await waitFor(() => expect(onError).toHaveBeenCalledWith('El usuario ya existe'));
    });

    it('click en el overlay cierra el modal, pero click DENTRO del contenido no (stopPropagation)', () => {
        const onClose = vi.fn();
        render(<CreateAdminModal onClose={onClose} onSuccess={() => {}} onError={() => {}} />);
        fireEvent.click(document.querySelector('.admin-modal-content'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(document.querySelector('.admin-modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('el botón "Cancelar" cierra el modal sin llamar al servicio', () => {
        const onClose = vi.fn();
        render(<CreateAdminModal onClose={onClose} onSuccess={() => {}} onError={() => {}} />);
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalled();
        expect(createAdminMock).not.toHaveBeenCalled();
    });
});
