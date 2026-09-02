import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Nosotros } from '../src/feactures/gym-main/Comoponents/Nosotros/Nosotros';

const { getPublicLandingMock } = vi.hoisted(() => ({ getPublicLandingMock: vi.fn() }));
vi.mock('../src/service/landing.service', () => ({ LandingService: { getPublicLanding: getPublicLandingMock } }));

beforeEach(() => { getPublicLandingMock.mockReset(); });

describe('Nosotros (landing pública) — equipo', () => {
    it('mientras carga, no renderiza nada', () => {
        getPublicLandingMock.mockReturnValue(new Promise(() => {}));
        const { container } = render(<Nosotros />);
        expect(container).toBeEmptyDOMElement();
    });

    it('sin coaches configurados, usa los de fábrica (INITIAL_COACHES)', async () => {
        getPublicLandingMock.mockResolvedValue({ coaches: [] });
        render(<Nosotros />);
        expect(await screen.findByText(/Nuestro Equipo/)).toBeInTheDocument();
        // Al menos debe renderizar alguna tarjeta de coach por defecto.
        expect(document.querySelectorAll('.team-card').length).toBeGreaterThan(0);
    });

    it('con coaches propios configurados, los usa a ellos', async () => {
        getPublicLandingMock.mockResolvedValue({
            coaches: [{ _id: 'co1', name: 'Coach E2E', role: 'Head Coach', instagram: '@coach_ffit', specialty: ['Fuerza'], bio: 'Bio' }]
        });
        render(<Nosotros />);
        expect(await screen.findByText('Coach E2E')).toBeInTheDocument();
        expect(screen.getByText('Fuerza')).toBeInTheDocument();
    });

    it('arma el link de Instagram sacando la @ del handle', async () => {
        getPublicLandingMock.mockResolvedValue({
            coaches: [{ _id: 'co1', name: 'Coach Insta', role: 'R', instagram: '@handle_test', specialty: [], bio: '' }]
        });
        render(<Nosotros />);
        await screen.findByText('Coach Insta');
        const link = screen.getByText('Coach Insta').closest('a');
        expect(link).toHaveAttribute('href', 'https://instagram.com/handle_test');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('BUG MENOR: un coach SIN instagram genera un link roto (https://instagram.com/undefined) en vez de deshabilitar el link', async () => {
        getPublicLandingMock.mockResolvedValue({
            coaches: [{ _id: 'co1', name: 'Coach Sin Insta', role: 'R', specialty: [], bio: '' }]
        });
        render(<Nosotros />);
        await screen.findByText('Coach Sin Insta');
        const link = screen.getByText('Coach Sin Insta').closest('a');
        expect(link).toHaveAttribute('href', 'https://instagram.com/undefined');
    });

    it('sin specialty (undefined), no crashea y no renderiza tags', async () => {
        getPublicLandingMock.mockResolvedValue({
            coaches: [{ _id: 'co1', name: 'Coach Sin Tags', role: 'R', bio: '' }]
        });
        expect(() => render(<Nosotros />)).not.toThrow();
        await screen.findByText('Coach Sin Tags');
    });

    it('si falla la carga, usa igual los coaches de fábrica', async () => {
        getPublicLandingMock.mockRejectedValue(new Error('fail'));
        render(<Nosotros />);
        await screen.findByText(/Nuestro Equipo/);
        expect(document.querySelectorAll('.team-card').length).toBeGreaterThan(0);
    });
});
