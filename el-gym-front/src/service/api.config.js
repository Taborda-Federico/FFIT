const API_URL = 'http://localhost:5000/api';

export const apiFetch = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');

    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en la petición');
    }

    return response.json();
};