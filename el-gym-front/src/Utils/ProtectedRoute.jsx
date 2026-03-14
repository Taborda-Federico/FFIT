import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contex/AuthContext'; // Ajusta la ruta a tu AuthContext

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user } = useAuth();

    if (!user || !user.token) {
        return <Navigate to="/" replace />;
    }

    if (requireAdmin && user.role !== 'admin') {
        return <Navigate to="/user" replace />;
    }

    if (!requireAdmin && user.role === 'admin') {
        return <Navigate to="/admin" replace />;
    }


    return children;
};