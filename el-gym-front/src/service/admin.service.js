const API_URL = 'http://localhost:5000/api';

export const AdminService = {
    // 1. Buscar alumnos para el buscador de la vista de progreso
    searchStudents: async (query, token) => {
        const response = await fetch(`${API_URL}/users/search?q=${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await response.json();
    },

    // 2. Traer el historial y notas de un alumno
getStudentProgress: async (alumnoId, token) => {
        // Asegúrate de que la ruta sea /admin/student-progress/
        const response = await fetch(`${API_URL}/admin/student-progress/${alumnoId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 404) {
            throw new Error("La ruta del servidor no existe. Revisa server.js");
        }
        
        if (!response.ok) throw new Error("Error al obtener el progreso");
        return await response.json();
    },
    createNote: async (notaData, token) => {
        const response = await fetch(`${API_URL}/admin/student-notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(notaData)
        });
        
        if (!response.ok) throw new Error("Error al crear la nota");
        return await response.json();
    }
};
