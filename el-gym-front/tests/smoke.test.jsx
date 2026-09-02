import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../src/Utils/Button';

describe('smoke test de infraestructura frontend', () => {
    it('renderiza un componente simple', () => {
        render(<Button>Hola</Button>);
        expect(screen.getByText('Hola')).toBeInTheDocument();
    });

    it('onClick funciona', () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Click</Button>);
        fireEvent.click(screen.getByText('Click'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('localStorage real de jsdom funciona', () => {
        localStorage.setItem('x', 'y');
        expect(localStorage.getItem('x')).toBe('y');
    });

    it('fetch no mockeado explota fuerte (red de seguridad activa)', () => {
        expect(() => fetch('https://ffit.onrender.com/api/users')).toThrow();
    });
});
