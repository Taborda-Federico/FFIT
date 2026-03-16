// src/service/user.service.js
const API_URL = 'https://ffit.onrender.com/api';

export const UserService = {
    // Necesitamos pasarle los datos del formulario y el Token del admin
    createStudent: async (studentData, token) => {
        try {
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 🔑 ¡Aquí le mostramos el Pase VIP al backend!
                },
                body: JSON.stringify(studentData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al registrar el alumno');
            }

            return data;
        } catch (error) {
            throw error;
        }
    },
    getStudents: async (token) => {
        try {
            const response = await fetch(`${API_URL}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    },
    renewMembership: async (alumnoId, token) => {
        const response = await fetch(`${API_URL}/users/${alumnoId}/renew`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Error al registrar el pago");
        return await response.json();
    },

    // Eliminar Alumno
    deleteUser: async (alumnoId, token) => {
        const response = await fetch(`${API_URL}/users/${alumnoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Error al eliminar el alumno");
        return await response.json();
    }
};