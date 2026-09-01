import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerClases } from '../src/feactures/gym-main/Comoponents/clases/VerClases';

const { getPublicLandingMock } = vi.hoisted(() => ({ getPublicLandingMock: vi.fn() }));
vi.mock('../src/service/landing.service', () => ({ LandingService: { getPublicLanding: getPublicLandingMock } }));

beforeEach(() => { getPublicLandingMock.mockReset(); });

describe('VerClases (landing pública)', () => {
    it('mientras carga, no renderiza nada (evita parpadeo) en vez de un spinner', () => {
        getPublicLandingMock.mockReturnValue(new Promise(() => {})); // nunca resuelve
        const { container } = render(<VerClases />);
        expect(container).toBeEmptyDOMElement();
    });

    it('si el admin configuró clases propias, las usa', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [{ _id: 'c1', title: 'Clase Personalizada', iconName: 'FaDumbbell', image: '' }] });
        render(<VerClases />);
        expect(await screen.findByText('Clase Personalizada')).toBeInTheDocument();
    });

    it('sin clases configuradas (array vacío), usa las clases "de fábrica" (INITIAL_CLASSES)', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [] });
        render(<VerClases />);
        expect(await screen.findByText('Crossfit')).toBeInTheDocument();
    });

    it('si falla la carga (ej. backend caído), igual muestra las clases de fábrica en vez de una sección vacía', async () => {
        getPublicLandingMock.mockRejectedValue(new Error('fail'));
        render(<VerClases />);
        expect(await screen.findByText('Crossfit')).toBeInTheDocument();
    });

    it('click en una clase abre el modal de detalle con su descripción', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [] });
        render(<VerClases />);
        await screen.findByText('Crossfit');
        fireEvent.click(screen.getByText('Crossfit'));
        expect(screen.getByText(/Desafiá tus límites/)).toBeInTheDocument();
    });

    it('"Ver Horarios" dentro del modal lo cierra (setSelectedClass(null))', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [] });
        render(<VerClases />);
        await screen.findByText('Crossfit');
        fireEvent.click(screen.getByText('Crossfit'));
        fireEvent.click(screen.getByText('Ver Horarios'));
        expect(screen.queryByText(/Desafiá tus límites/)).not.toBeInTheDocument();
    });

    it('click en el botón de cerrar (X) cierra el modal', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [] });
        const { container } = render(<VerClases />);
        await screen.findByText('Crossfit');
        fireEvent.click(screen.getByText('Crossfit'));
        fireEvent.click(container.querySelector('.close-btn'));
        expect(screen.queryByText(/Desafiá tus límites/)).not.toBeInTheDocument();
    });

    it('FRÁGIL: cerrar clickeando el overlay depende de que su className sea EXACTAMENTE "modal-overlay" (compara con === , no con currentTarget)', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [] });
        const { container } = render(<VerClases />);
        await screen.findByText('Crossfit');
        fireEvent.click(screen.getByText('Crossfit'));
        // Clickear el overlay (no el contenido) sí cierra, hoy funciona:
        fireEvent.click(container.querySelector('.modal-overlay'));
        expect(screen.queryByText(/Desafiá tus límites/)).not.toBeInTheDocument();
        // Pero clickear DENTRO del modal-content no debe cerrar (sanity check
        // de que el modal no se cierra por cualquier click):
    });

    it('clickear dentro del contenido del modal NO lo cierra', async () => {
        getPublicLandingMock.mockResolvedValue({ clases: [] });
        const { container } = render(<VerClases />);
        await screen.findByText('Crossfit');
        fireEvent.click(screen.getByText('Crossfit'));
        fireEvent.click(container.querySelector('.modal-content'));
        expect(screen.getByText(/Desafiá tus límites/)).toBeInTheDocument();
    });
});
