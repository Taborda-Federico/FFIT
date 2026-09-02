import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/contex/AuthContext';

function Consumidor() {
    const { user, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="user">{user ? JSON.stringify(user) : 'sin-sesion'}</span>
            <button onClick={() => login({ nombre: 'Fede', role: 'admin', token: 'tok123' })}>login</button>
            <button onClick={logout}>logout</button>
        </div>
    );
}

describe('AuthContext (implementación real, sin mocks)', () => {
    it('sin nada en localStorage, arranca sin usuario', () => {
        render(<AuthProvider><Consumidor /></AuthProvider>);
        expect(screen.getByTestId('user')).toHaveTextContent('sin-sesion');
    });

    it('hidrata el usuario desde localStorage al montar', () => {
        localStorage.setItem('ffit_user', JSON.stringify({ nombre: 'Guardado', role: 'user', token: 'x' }));
        render(<AuthProvider><Consumidor /></AuthProvider>);
        expect(screen.getByTestId('user')).toHaveTextContent('Guardado');
    });

    it('login() persiste en localStorage bajo la clave "ffit_user" y actualiza el estado', () => {
        render(<AuthProvider><Consumidor /></AuthProvider>);
        act(() => { screen.getByText('login').click(); });
        expect(screen.getByTestId('user')).toHaveTextContent('Fede');
        expect(JSON.parse(localStorage.getItem('ffit_user')).nombre).toBe('Fede');
    });

    it('logout() limpia el estado y localStorage', () => {
        render(<AuthProvider><Consumidor /></AuthProvider>);
        act(() => { screen.getByText('login').click(); });
        act(() => { screen.getByText('logout').click(); });
        expect(screen.getByTestId('user')).toHaveTextContent('sin-sesion');
        expect(localStorage.getItem('ffit_user')).toBeNull();
    });

    it('BUG: JSON corrupto en localStorage["ffit_user"] hace explotar el render inicial de TODA la app (sin Error Boundary que lo atrape)', () => {
        localStorage.setItem('ffit_user', 'undefined'); // string literal, no JSON válido
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<AuthProvider><Consumidor /></AuthProvider>)).toThrow();
        spy.mockRestore();
    });

    it('useAuth() fuera de un AuthProvider devuelve undefined (createContext sin valor default)', () => {
        function SinProvider() {
            const ctx = useAuth();
            return <span>{ctx === undefined ? 'undefined-ctx' : 'con-ctx'}</span>;
        }
        render(<SinProvider />);
        expect(screen.getByText('undefined-ctx')).toBeInTheDocument();
    });
});
