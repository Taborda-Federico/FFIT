// src/service/auth.service.js
const API_URL = 'https://ffit.onrender.com/api'; // La ruta de tu backend

export const AuthService = {
    login: async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            return data; // Retorna { _id, nombre, role, token }
        } catch (error) {
            throw error;
        }
    }
};