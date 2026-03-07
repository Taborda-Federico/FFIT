import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // 1. Al cargar la app, buscamos si ya había un usuario guardado
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('ffit_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    // 2. Al iniciar sesión, guardamos en React y en el navegador
    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('ffit_user', JSON.stringify(userData));
    };

    // 3. Al cerrar sesión, borramos todo
    const logout = () => {
        setUser(null);
        localStorage.removeItem('ffit_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);