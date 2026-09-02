import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../src/Utils/ProtectedRoute';

const { authState } = vi.hoisted(() => ({ authState: { user: null } }));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authState }));

function renderConRuta(user, requireAdmin) {
    authState.user = user;
    return render(
        <MemoryRouter initialEntries={['/protegida']}>
            <Routes>
                <Route path="/" element={<span>home-publica</span>} />
                <Route path="/user" element={<span>zona-user</span>} />
                <Route path="/admin" element={<span>zona-admin</span>} />
                <Route path="/protegida" element={
                    <ProtectedRoute requireAdmin={requireAdmin}><span>contenido-protegido</span></ProtectedRoute>
                } />
            </Routes>
        </MemoryRouter>
    );
}

describe('ProtectedRoute', () => {
    it('sin usuario, redirige a "/"', () => {
        renderConRuta(null, false);
        expect(screen.getByText('home-publica')).toBeInTheDocument();
    });

    it('usuario sin token (token vacío), se trata como no logueado', () => {
        renderConRuta({ role: 'user', token: '' }, false);
        expect(screen.getByText('home-publica')).toBeInTheDocument();
    });

    it('requireAdmin=true con un usuario role=user, redirige a "/user"', () => {
        renderConRuta({ role: 'user', token: 'x' }, true);
        expect(screen.getByText('zona-user')).toBeInTheDocument();
    });

    it('requireAdmin=false con un usuario role=admin, redirige a "/admin" (un admin no puede ver la app de alumno)', () => {
        renderConRuta({ role: 'admin', token: 'x' }, false);
        expect(screen.getByText('zona-admin')).toBeInTheDocument();
    });

    it('rol correcto → renderiza el contenido protegido', () => {
        renderConRuta({ role: 'admin', token: 'x' }, true);
        expect(screen.getByText('contenido-protegido')).toBeInTheDocument();
    });
});
