import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contex/AuthContext'; // Ajusta la ruta a tu AuthContext

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user } = useAuth();

    // 1. Si no está logueado, patada a la pantalla principal
    if (!user || !user.token) {
        return <Navigate to="/" replace />;
    }

    // 2. Si la ruta exige ser Admin, pero el usuario es Alumno, patada a su dashboard
    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/user" replace />;
    }

    // 3. (Opcional) Si la ruta es de Alumno, pero es un Admin, lo mandamos a su panel
    if (!requireAdmin && user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }

    // 4. Si pasa todos los filtros, ¡bienvenido!
    return children;
};