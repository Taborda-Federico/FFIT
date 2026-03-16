const API_URL = 'https://ffit.onrender.com/api';

export const LandingService = {
    // 1. Traer la configuración del admin actual (Privado - Requiere Token)
    getLanding: async (token) => {
        try {
            const response = await fetch(`${API_URL}/landing/my-site`, {
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

    // 2. Guardar/Actualizar la configuración (Privado - Requiere Token)
    updateLanding: async (landingData, token) => {
        try {
            const response = await fetch(`${API_URL}/landing/my-site`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(landingData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    },

    // 3. NUEVA FUNCIÓN: Obtener la web pública (Público - No requiere Token)
    getPublicLanding: async () => {
        try {
            const response = await fetch(`${API_URL}/landing/public`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            return data;
        } catch (error) {
            throw error;
        }
    }
};