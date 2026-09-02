// src/service/plan.service.js
const API_URL = 'https://ffit.onrender.com/api';

export const PlanService = {
    // 1. Guardar como Plantilla Reutilizable
    guardarPlantilla: async (planData, token) => {
        try {
            const response = await fetch(`${API_URL}/planes/plantilla`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(planData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    },

    // 2. Publicar/Asignar a un Alumno
    publicarPlan: async (planData, token) => {
        try {
            const response = await fetch(`${API_URL}/planes/publicar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(planData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    },

    // 3. Obtener todas las plantillas para el desplegable
    getPlantillas: async (token) => {
        try {
            const response = await fetch(`${API_URL}/planes/plantillas`, {
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

    // 4. Actualizar una plantilla EXISTENTE (edición real, no crea una copia)
    actualizarPlantilla: async (plantillaId, planData, token) => {
        const response = await fetch(`${API_URL}/planes/plantilla/${plantillaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(planData)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    },

    // 5. Eliminar una plantilla
    eliminarPlantilla: async (plantillaId, token) => {
        const response = await fetch(`${API_URL}/planes/plantilla/${plantillaId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        return data;
    }
};