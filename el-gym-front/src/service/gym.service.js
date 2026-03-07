import { apiFetch } from './api.config';

export const GymService = {
    // ==========================================
    // 1. AUTENTICACIÓN & PERFIL
    // ==========================================
    loginAdmin: (credentials) => apiFetch('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),
    
    getAdminProfile: () => apiFetch('/auth/admin/me'),

    // ==========================================
    // 2. ALUMNOS (SOCIOS) - CRUD COMPLETO
    // ==========================================
    getAlumnos: (filtros = '') => apiFetch(`/alumnos?${filtros}`), 
    getAlumnoById: (id) => apiFetch(`/alumnos/${id}`),
    registerAlumno: (data) => apiFetch('/alumnos', { method: 'POST', body: JSON.stringify(data) }),
    updateAlumno: (id, data) => apiFetch(`/alumnos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteAlumno: (id) => apiFetch(`/alumnos/${id}`, { method: 'DELETE' }),
    toggleEstadoAlumno: (id) => apiFetch(`/alumnos/${id}/toggle-status`, { method: 'PATCH' }), 

    // ==========================================
    // 3. PLANES & ENTRENAMIENTO
    // ==========================================
    getPlanes: () => apiFetch('/planes'),
    getPlanByAlumno: (alumnoId) => apiFetch(`/planes/alumno/${alumnoId}`),
    publishPlan: (planData) => apiFetch('/planes', { method: 'POST', body: JSON.stringify(planData) }),
    updatePlan: (id, planData) => apiFetch(`/planes/${id}`, { method: 'PUT', body: JSON.stringify(planData) }),
    deletePlan: (id) => apiFetch(`/planes/${id}`, { method: 'DELETE' }),
    
    // ==========================================
    // 4. BIBLIOTECA GLOBAL DE EJERCICIOS (Cloud)
    // ==========================================
    getExerciseLibrary: (search = '') => apiFetch(`/exercises?search=${search}`),
    createExercise: (data) => apiFetch('/exercises', { method: 'POST', body: JSON.stringify(data) }),
    updateExercise: (id, data) => apiFetch(`/exercises/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteExercise: (id) => apiFetch(`/exercises/${id}`, { method: 'DELETE' }),

    // ==========================================
    // 5. PLANTILLAS (Templates)
    // ==========================================
    getTemplates: () => apiFetch('/templates'),
    getTemplateById: (id) => apiFetch(`/templates/${id}`),
    saveTemplate: (data) => apiFetch('/templates', { method: 'POST', body: JSON.stringify(data) }),
    deleteTemplate: (id) => apiFetch(`/templates/${id}`, { method: 'DELETE' }),

    // ==========================================
    // 6. PAGOS, FINANZAS & VENCIMIENTOS
    // ==========================================
    registrarPago: (alumnoId, pagoData) => apiFetch(`/pagos/${alumnoId}`, { method: 'POST', body: JSON.stringify(pagoData) }),
    getPagosPendientes: () => apiFetch('/pagos/pendientes'),
    getHistorialFinanciero: (filtros = '') => apiFetch(`/pagos/historial?${filtros}`),
    descargarRecibo: (pagoId) => apiFetch(`/pagos/recibo/${pagoId}`), // Devuelve PDF o Link

    // ==========================================
    // 7. ASISTENCIA & CHECK-IN (QR Ready)
    // ==========================================
    registrarCheckIn: (alumnoId) => apiFetch('/attendance/check-in', { method: 'POST', body: JSON.stringify({ alumnoId }) }),
    getAsistenciaHoy: () => apiFetch('/attendance/today'),
    getReporteAsistencia: (alumnoId) => apiFetch(`/attendance/report/${alumnoId}`),

    // ==========================================
    // 8. MÉTRICAS DEL NEGOCIO (DASHBOARD)
    // ==========================================
    getAdminStats: () => apiFetch('/stats/dashboard'), 
    getReporteIngresos: (periodo = 'month') => apiFetch(`/stats/revenue?period=${periodo}`),
    
    // ==========================================
    // 9. CONTENIDO LANDING (CMS)
    // ==========================================
    getLandingContent: () => apiFetch('/content'),
    updateLandingContent: (section, data) => apiFetch(`/content/${section}`, { method: 'PUT', body: JSON.stringify(data) }),
    
    // Gestión de Staff/Coaches específica
    getStaff: () => apiFetch('/content/staff'),
    addStaffMember: (data) => apiFetch('/content/staff', { method: 'POST', body: JSON.stringify(data) }),
    updateStaffMember: (id, data) => apiFetch(`/content/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    removeStaffMember: (id) => apiFetch(`/content/staff/${id}`, { method: 'DELETE' }),

    // ==========================================
    // 10. MULTIMEDIA (Subida de fotos/videos)
    // ==========================================
    uploadMedia: (formData) => apiFetch('/media/upload', { 
        method: 'POST', 
        body: formData, // FormData no requiere JSON.stringify
        headers: { 'Content-Type': 'multipart/form-data' } 
    }),
};
/*





*/
 