const API_URL = 'https://ffit.onrender.com/api';

export const StudentService = {
    // 1. Traer datos del Inicio (Días restantes, Plan activo, Racha)
    getDashboard: async (token) => {
        try {
            const response = await fetch(`${API_URL}/student/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    },

    // 2. Guardar el entrenamiento con los pesos levantados
    saveWorkout: async (workoutData, token) => {
        try {
            const response = await fetch(`${API_URL}/student/workout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(workoutData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    },

    // 3. Traer el historial de entrenamientos
    getHistory: async (token) => {
        try {
            const response = await fetch(`${API_URL}/student/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }

    },
    // Traer notificaciones
    getNotifications: async (token) => {
        const response = await fetch(`${API_URL}/student/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Error al cargar notificaciones");
        return await response.json();
    },

    // Marcar como leída
    markNotificationRead: async (notifId, token) => {
        await fetch(`${API_URL}/student/notifications/${notifId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

};