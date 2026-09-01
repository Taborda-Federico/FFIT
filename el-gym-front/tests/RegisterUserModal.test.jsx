import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterUserModal } from '../src/feactures/Admin/pages/RegisterUserModal';

const { createStudentMock, authValue } = vi.hoisted(() => ({
    createStudentMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/user.service', () => ({ UserService: { createStudent: createStudentMock } }));

beforeEach(() => { createStudentMock.mockReset(); });

function llenarFormularioCompleto() {
    fireEvent.change(screen.getByPlaceholderText('Nombre y Apellido'), { target: { value: 'Fede' } });
    fireEvent.change(screen.getByPlaceholderText('DNI / Identificación'), { target: { value: '30111222' } });
    fireEvent.change(screen.getByPlaceholderText('Teléfono de contacto'), { target: { value: '1122334455' } });
    fireEvent.change(screen.getByPlaceholderText('Correo Electrónico'), { target: { value: 'fede@x.com' } });
    fireEvent.change(screen.getByPlaceholderText('Dirección de Domicilio'), { target: { value: 'Calle Falsa 123' } });
    fireEvent.change(screen.getByPlaceholderText('Peso (kg)'), { target: { value: '80' } });
    fireEvent.change(screen.getByPlaceholderText('Altura (cm)'), { target: { value: '178' } });
    fireEvent.change(screen.getByPlaceholderText('Monto de Pago'), { target: { value: '15000' } });
}

describe('RegisterUserModal — el frontend SÍ junta y envía todos los campos (domicilio, montoPago, fechaInicio)', () => {
    it('al enviar el form completo, llama a createStudent con TODOS los campos, incluidos los que el backend descarta', async () => {
        createStudentMock.mockResolvedValue({ _id: '1', nombre: 'Fede' });
        render(<RegisterUserModal onClose={() => {}} onSave={() => {}} />);
        llenarFormularioCompleto();
        fireEvent.click(screen.getByText('Finalizar Registro'));
        await waitFor(() => expect(createStudentMock).toHaveBeenCalled());
        const payload = createStudentMock.mock.calls[0][0];
        expect(payload).toMatchObject({
            nombre: 'Fede', dni: '30111222', telefono: '1122334455', email: 'fede@x.com',
            domicilio: 'Calle Falsa 123', peso: '80', altura: '178', montoPago: '15000'
        });
        expect(payload.fechaInicio).toBeTruthy();
        // Este payload confirma que la responsabilidad de "domicilio/montoPago/
        // fechaInicio se pierden" (ver reporte y tests del backend) es 100%
        // del backend: el frontend hace su parte correctamente.
    });

    it('nombre, dni, telefono, email y monto de pago son obligatorios (atributo required nativo)', () => {
        render(<RegisterUserModal onClose={() => {}} onSave={() => {}} />);
        expect(screen.getByPlaceholderText('Nombre y Apellido')).toBeRequired();
        expect(screen.getByPlaceholderText('DNI / Identificación')).toBeRequired();
        expect(screen.getByPlaceholderText('Teléfono de contacto')).toBeRequired();
        expect(screen.getByPlaceholderText('Correo Electrónico')).toBeRequired();
        expect(screen.getByPlaceholderText('Monto de Pago')).toBeRequired();
    });

    it('domicilio, peso y altura NO son obligatorios', () => {
        render(<RegisterUserModal onClose={() => {}} onSave={() => {}} />);
        expect(screen.getByPlaceholderText('Dirección de Domicilio')).not.toBeRequired();
        expect(screen.getByPlaceholderText('Peso (kg)')).not.toBeRequired();
        expect(screen.getByPlaceholderText('Altura (cm)')).not.toBeRequired();
    });

    it('fechaInicio arranca precargada con la fecha de hoy', () => {
        render(<RegisterUserModal onClose={() => {}} onSave={() => {}} />);
        const hoy = new Date().toISOString().split('T')[0];
        expect(screen.getByDisplayValue(hoy)).toBeInTheDocument();
    });

    it('con éxito, llama a onSave con la respuesta del server y a onClose', async () => {
        const onSave = vi.fn();
        const onClose = vi.fn();
        createStudentMock.mockResolvedValue({ _id: '1', nombre: 'Fede' });
        render(<RegisterUserModal onClose={onClose} onSave={onSave} />);
        llenarFormularioCompleto();
        fireEvent.click(screen.getByText('Finalizar Registro'));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith({ _id: '1', nombre: 'Fede' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('si el server rechaza, NO cierra el modal (eso funciona bien)', async () => {
        const onClose = vi.fn();
        createStudentMock.mockRejectedValue(new Error('El correo o DNI ya están registrados'));
        render(<RegisterUserModal onClose={onClose} onSave={() => {}} />);
        llenarFormularioCompleto();
        fireEvent.click(screen.getByText('Finalizar Registro'));
        await screen.findByText(/Error al registrar socio/);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('BUG (confirmado con e2e real contra el backend real): el mensaje específico del backend NUNCA se muestra, siempre cae al genérico "Error al registrar socio"', async () => {
        // UserService.createStudent usa fetch nativo y tira `new Error(data.message)`
        // — un Error común, SIN `.response`. Pero este componente lee el
        // mensaje como `err.response?.data?.message` (forma de Axios), que
        // acá siempre da undefined. Por eso, sin importar qué diga el
        // backend (DNI duplicado, email duplicado, campo faltante...), el
        // alumno-operador siempre ve el mismo texto genérico.
        createStudentMock.mockRejectedValue(new Error('El correo o DNI ya están registrados en el sistema.'));
        render(<RegisterUserModal onClose={() => {}} onSave={() => {}} />);
        llenarFormularioCompleto();
        fireEvent.click(screen.getByText('Finalizar Registro'));
        expect(await screen.findByText('Error al registrar socio')).toBeInTheDocument();
        expect(screen.queryByText(/ya están registrados/i)).not.toBeInTheDocument();
    });

    it('mientras está enviando, deshabilita los botones y muestra "Registrando..."', async () => {
        let resolver;
        createStudentMock.mockReturnValue(new Promise(r => { resolver = r; }));
        render(<RegisterUserModal onClose={() => {}} onSave={() => {}} />);
        llenarFormularioCompleto();
        fireEvent.click(screen.getByText('Finalizar Registro'));
        expect(await screen.findByText('Registrando...')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeDisabled();
        resolver({ _id: '1' });
    });

    it('el botón "Cancelar" llama a onClose sin enviar el formulario', () => {
        const onClose = vi.fn();
        render(<RegisterUserModal onClose={onClose} onSave={() => {}} />);
        fireEvent.click(screen.getByText('Cancelar'));
        expect(onClose).toHaveBeenCalled();
        expect(createStudentMock).not.toHaveBeenCalled();
    });
});
