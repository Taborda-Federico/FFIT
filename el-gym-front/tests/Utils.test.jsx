import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '../src/Utils/Button';
import { Toast } from '../src/Utils/Toast';
import { ConfirmModal } from '../src/Utils/ConfirmModal';
import { NotFound } from '../src/Utils/NotFound';

describe('Button', () => {
    it('renderiza como <button> por defecto', () => {
        render(<Button>Click</Button>);
        expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
    });

    it('renderiza como <a> cuando se pasa `href`', () => {
        render(<Button href="/x">Ir</Button>);
        expect(screen.getByRole('link', { name: 'Ir' })).toHaveAttribute('href', '/x');
    });

    it('aplica las clases de variant/size/fullWidth', () => {
        render(<Button variant="outline" size="lg" fullWidth>X</Button>);
        expect(screen.getByRole('button')).toHaveClass('btn-outline', 'btn-lg', 'btn-full');
    });

    it('dispara onClick', () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>X</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('respeta `disabled`', () => {
        const onClick = vi.fn();
        render(<Button disabled onClick={onClick}>X</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe('Toast', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('muestra el mensaje y la clase según el tipo', () => {
        render(<Toast message="Guardado" type="success" onClose={() => {}} />);
        const toast = screen.getByText('Guardado');
        expect(toast).toHaveClass('toast-container', 'success');
    });

    it('se auto-cierra a los 3 segundos', () => {
        const onClose = vi.fn();
        render(<Toast message="X" type="error" onClose={onClose} />);
        expect(onClose).not.toHaveBeenCalled();
        vi.advanceTimersByTime(3000);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('limpia el timer al desmontar (no llama a onClose si ya no está montado)', () => {
        const onClose = vi.fn();
        const { unmount } = render(<Toast message="X" type="info" onClose={onClose} />);
        unmount();
        vi.advanceTimersByTime(5000);
        expect(onClose).not.toHaveBeenCalled();
    });
});

describe('ConfirmModal', () => {
    it('modo genérico (sin `plan`): usa title/message/confirmText pasados por props', () => {
        render(<ConfirmModal title="¿Seguro?" message="Esta acción no se puede deshacer" confirmText="Sí" onConfirm={() => {}} onClose={() => {}} />);
        expect(screen.getByText('¿Seguro?')).toBeInTheDocument();
        expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
        expect(screen.getByText('Sí')).toBeInTheDocument();
    });

    it('modo `plan`: muestra alumno, título del plan y selector de semanas (default 4)', () => {
        render(<ConfirmModal plan={{ alumno: 'Fede', titulo: 'Fuerza' }} onConfirm={() => {}} onClose={() => {}} />);
        expect(screen.getByText('Fede')).toBeInTheDocument();
        expect(screen.getByText('Fuerza')).toBeInTheDocument();
        expect(screen.getByDisplayValue('4 semanas (Mensual)')).toBeInTheDocument();
    });

    it('cambiar la duración y confirmar pasa el número elegido a onConfirm', () => {
        const onConfirm = vi.fn();
        render(<ConfirmModal plan={{ alumno: 'Fede', titulo: 'Fuerza' }} onConfirm={onConfirm} onClose={() => {}} />);
        fireEvent.change(screen.getByDisplayValue('4 semanas (Mensual)'), { target: { value: '8' } });
        fireEvent.click(screen.getByText('¡Publicar ahora!'));
        expect(onConfirm).toHaveBeenCalledWith(8);
    });

    it('en modo `isAlert`, no muestra el botón de confirmar, solo "Aceptar"', () => {
        render(<ConfirmModal isAlert title="Aviso" message="Info" onClose={() => {}} />);
        expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
        expect(screen.getByText('Aceptar')).toBeInTheDocument();
    });

    it('click en el overlay cierra el modal; click en el contenido no (stopPropagation)', () => {
        const onClose = vi.fn();
        const { container } = render(<ConfirmModal title="X" message="Y" onConfirm={() => {}} onClose={onClose} />);
        fireEvent.click(container.querySelector('.modal-confirm-card'));
        expect(onClose).not.toHaveBeenCalled();
        fireEvent.click(container.querySelector('.modal-overlay'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('NotFound', () => {
    it('muestra el 404 y el botón vuelve a la home', () => {
        render(<MemoryRouter><NotFound /></MemoryRouter>);
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Volver al Inicio')).toBeInTheDocument();
    });
});
