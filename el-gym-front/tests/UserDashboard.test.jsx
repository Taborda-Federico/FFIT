import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UserDashboard } from '../src/feactures/User/UserDashboard';

const { getDashboardMock, getHistoryMock, saveWorkoutMock, authValue } = vi.hoisted(() => ({
    getDashboardMock: vi.fn(),
    getHistoryMock: vi.fn(),
    saveWorkoutMock: vi.fn(),
    authValue: { user: { token: 'tok' } },
}));
vi.mock('../src/contex/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('../src/service/student.service', () => ({
    StudentService: { getDashboard: getDashboardMock, getHistory: getHistoryMock, saveWorkout: saveWorkoutMock }
}));

function dashboardConPlan(sesiones) {
    return {
        user: { nombre: 'Fede', estado: 'ACTIVO', diasRestantes: 10 },
        stats: { sesionesCompletadas: 0, racha: 0 },
        plan: { titulo: 'Plan X', semanasRestantes: 3, createdAt: '2020-01-01', sesiones }
    };
}

beforeEach(() => {
    getDashboardMock.mockReset().mockResolvedValue(dashboardConPlan([
        { _id: 's1', nombre: 'Día 1', bloques: [{ tipo: 'standard', ejercicios: [{ id: 'e1', nombre: 'Press', series: 1 }] }] }
    ]));
    getHistoryMock.mockReset().mockResolvedValue([]);
    saveWorkoutMock.mockReset().mockResolvedValue({});
    localStorage.clear();
});

async function esperarCarga() {
    // OJO: "Plan X" aparece dos veces en pantalla a la vez (el widget de
    // progreso Y el indicador dentro de HomeHub) — buscarlo con
    // getByText/queryByText tira "multiple elements" y waitFor nunca
    // resuelve. Esperamos en cambio a que el spinner de carga desaparezca.
    await waitFor(() => expect(document.querySelector('.user-loading-screen')).toBeNull());
}

describe('UserDashboard — carga y navegación', () => {
    it('muestra el spinner de carga y después el contenido', async () => {
        render(<UserDashboard />);
        expect(document.querySelector('.user-loading-screen')).not.toBeNull();
        await esperarCarga();
        expect(document.querySelector('.user-loading-screen')).toBeNull();
    });

    it('el widget de progreso muestra las "semanas restantes" que vienen del backend (incluyendo el bug de doble-decremento, ver reporte)', async () => {
        render(<UserDashboard />);
        await esperarCarga();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('SEMANAS')).toBeInTheDocument();
    });

    it('la navegación inferior cambia entre Inicio, Historial y Perfil', async () => {
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Historial'));
        expect(screen.getByText('LOGBOOK PERSONAL')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Perfil'));
        expect(screen.getByText(/FFIT\+ v2\.0/)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Inicio'));
        expect(screen.getByText('Día 1')).toBeInTheDocument();
    });
});

describe('UserDashboard — flujo completo de entrenamiento', () => {
    it('empezar una sesión persiste `ffit_active_workout` en localStorage (sobrevive un refresh)', async () => {
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        await waitFor(() => expect(localStorage.getItem('ffit_active_workout')).not.toBeNull());
        expect(JSON.parse(localStorage.getItem('ffit_active_workout')).nombre).toBe('Día 1');
    });

    it('al finalizar, calcula la duración real transcurrida en minutos y la manda al guardar', async () => {
        // Controlamos Date.now() directamente (en vez de fake timers +
        // advanceTimersByTime) para no interferir con el polling interno de
        // waitFor(), que depende de setTimeout/setInterval reales.
        const inicio = 1_700_000_000_000;
        const spy = vi.spyOn(Date, 'now').mockReturnValue(inicio);
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        spy.mockReturnValue(inicio + 5 * 60 * 1000); // 5 minutos después
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        await waitFor(() => expect(saveWorkoutMock).toHaveBeenCalled());
        const payload = saveWorkoutMock.mock.calls[0][0];
        expect(payload.duracion).toBe('5m');
    });

    it('NUEVO: al guardar, manda el sesionId de la sesión puntual que se entrenó (no solo el nombre)', async () => {
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        await waitFor(() => expect(saveWorkoutMock).toHaveBeenCalled());
        // 's1' es el _id de la sesión en el mock de arriba — con esto,
        // HomeHub puede distinguir dos sesiones que compartan `nombre`
        // (ver docs/CAMBIOS.md y HomeHub.test.jsx).
        expect(saveWorkoutMock.mock.calls[0][0].sesionId).toBe('s1');
    });

    it('BUG MENOR: un entrenamiento de menos de 1 minuto (o instantáneo) se reporta igual como "1m" (piso artificial)', async () => {
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/)); // finaliza casi al instante
        await waitFor(() => expect(saveWorkoutMock).toHaveBeenCalled());
        expect(saveWorkoutMock.mock.calls[0][0].duracion).toBe('1m');
    });

    it('después de guardar, limpia la sesión activa (localStorage) y cambia a la pestaña Historial', async () => {
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        await waitFor(() => expect(screen.getByText('LOGBOOK PERSONAL')).toBeInTheDocument());
        expect(localStorage.getItem('ffit_active_workout')).toBeNull();
    });

    it('si falla el guardado, muestra un modal de error y NO borra la sesión activa (se puede reintentar)', async () => {
        saveWorkoutMock.mockRejectedValue(new Error('fail'));
        render(<UserDashboard />);
        await esperarCarga();
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        expect(await screen.findByText(/No se pudo guardar la rutina/)).toBeInTheDocument();
        expect(localStorage.getItem('ffit_active_workout')).not.toBeNull();
    });

    it('BUG: un entrenamiento activo abandonado en localStorage desde una sesión previa se RETOMA al volver a entrar, sin importar cuánto tiempo pasó', async () => {
        const haceTresDias = Date.now() - 3 * 24 * 60 * 60 * 1000;
        localStorage.setItem('ffit_active_workout', JSON.stringify({
            nombre: 'Sesión Abandonada', bloques: [], startTime: haceTresDias
        }));
        render(<UserDashboard />);
        await waitFor(() => expect(screen.queryByText(/ENTRENAMIENTO ACTIVO/)).toBeInTheDocument());
        expect(screen.getByText('Sesión Abandonada')).toBeInTheDocument();
        // No hay ningún aviso de "esto es viejo, ¿querés descartarlo?" — el
        // alumno vuelve directo a un entrenamiento de hace 3 días.
    });
});
