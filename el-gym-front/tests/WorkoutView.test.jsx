import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WorkoutView } from '../src/feactures/User/WorkoutView';

function sesionEstandar(overrides = {}) {
    return {
        nombre: 'Día 1',
        bloques: [
            { tipo: 'standard', descanso: 60, ejercicios: [{ id: 'e1', nombre: 'Press banca', series: 3, reps: '10' }] }
        ],
        ...overrides
    };
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('WorkoutView — render por tipo de bloque', () => {
    it('bloque standard: usa `series` del primer ejercicio como maxSets', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.getByText(/SERIE 1 \/ 3/)).toBeInTheDocument();
    });

    it('bloque circuit: usa `vueltas` del bloque como maxSets (no las series del ejercicio)', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'circuit', descanso: 30, vueltas: 5, ejercicios: [{ id: 'e1', nombre: 'Burpees', tiempo: '20' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.getByText(/VUELTA 1 \/ 5/)).toBeInTheDocument();
    });

    it('bloque superset: muestra el botón "Añadir Ejercicio" no está acá (esa lógica es del admin), pero sí el badge SUPERSET', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'superset', descanso: 45, ejercicios: [{ id: 'e1', nombre: 'A' }, { id: 'e2', nombre: 'B' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.getByText('SUPERSET')).toBeInTheDocument();
    });

    it('un bloque sin ejercicios (array vacío) no se renderiza', () => {
        const session = sesionEstandar({ bloques: [{ tipo: 'standard', ejercicios: [] }] });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.queryByText(/SERIE/)).not.toBeInTheDocument();
    });

    it('una sesión sin bloques (plan vacío armado por el admin) no crashea, solo muestra el botón de finalizar', () => {
        render(<WorkoutView session={sesionEstandar({ bloques: [] })} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.getByText(/FINALIZAR ENTRENAMIENTO/)).toBeInTheDocument();
    });
});

// Las repeticiones ahora son obligatorias (al menos 1) para poder
// "Finalizar Serie" — ver describe de validación más abajo. Estos tests de
// progreso/timers no están probando esa regla, así que cargan una
// repetición cualquiera antes de cada click para no toparse con el botón
// deshabilitado.
function cargarReps(valor = '10', label = /Repeticiones serie/) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: valor } });
}

describe('WorkoutView — completar series/vueltas', () => {
    it('al finalizar una serie, avanza el contador y dispara el timer de descanso', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        expect(screen.getByText(/SERIE 2 \/ 3/)).toBeInTheDocument();
        expect(screen.getByText('RECUPERACIÓN')).toBeInTheDocument();
        expect(screen.getByText('60seg')).toBeInTheDocument();
    });

    it('al completar la última serie, el bloque queda "COMPLETADO" y el botón se deshabilita', () => {
        const { container } = render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        expect(screen.getByText('COMPLETADO')).toBeInTheDocument();
        expect(container.querySelector('.btn-finish-block-pro')).toBeDisabled();
    });

    it('el timer de descanso cuenta regresivo con fake timers y desaparece al llegar a 0', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        expect(screen.getByText('60seg')).toBeInTheDocument();
        act(() => { vi.advanceTimersByTime(60000); });
        expect(screen.queryByText('RECUPERACIÓN')).not.toBeInTheDocument();
    });

    it('el botón "SALTAR" corta el timer de descanso al toque', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        fireEvent.click(screen.getByText('SALTAR'));
        expect(screen.queryByText('RECUPERACIÓN')).not.toBeInTheDocument();
    });

    it('un bloque con descanso=0 no dispara el timer de recuperación', () => {
        const session = sesionEstandar({ bloques: [{ tipo: 'standard', descanso: 0, ejercicios: [{ id: 'e1', nombre: 'X', series: 2 }] }] });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        cargarReps();
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        expect(screen.queryByText('RECUPERACIÓN')).not.toBeInTheDocument();
    });
});

describe('WorkoutView — timer de ejercicio (circuit) e input de peso', () => {
    it('el timer de un ejercicio de circuito cuenta regresivo y vibra al llegar a 0', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'circuit', vueltas: 1, ejercicios: [{ id: 'e1', nombre: 'Plancha', tiempo: '5' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.click(screen.getByText(/5seg/));
        expect(screen.getByText('TIEMPO BAJO TENSIÓN')).toBeInTheDocument();
        act(() => { vi.advanceTimersByTime(5000); });
        expect(window.navigator.vibrate).toHaveBeenCalled();
        expect(screen.queryByText('TIEMPO BAJO TENSIÓN')).not.toBeInTheDocument();
    });

    it('el input de peso actualiza el payload por ejercicio (keyed por id)', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        const input = screen.getByLabelText(/Peso serie 1/);
        fireEvent.change(input, { target: { value: '55' } });
        expect(input).toHaveValue(55);
    });

    it('el link "VER" del video solo aparece si el ejercicio tiene `video`, y abre en pestaña nueva de forma segura', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'standard', ejercicios: [{ id: 'e1', nombre: 'X', series: 1, video: 'https://youtu.be/x' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        const link = screen.getByText('VER').closest('a');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('sin `video`, no muestra el link "VER"', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.queryByText('VER')).not.toBeInTheDocument();
    });
});

describe('WorkoutView — persistencia en localStorage', () => {
    it('el peso cargado se persiste en localStorage bajo ffit_workout_payload', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '80' } });
        const guardado = JSON.parse(localStorage.getItem('ffit_workout_payload'));
        expect(guardado.e1.pesoActual).toBe('80');
    });

    it('handleExit limpia localStorage y llama a onExit', () => {
        const onExit = vi.fn();
        const { container } = render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={onExit} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '80' } });
        fireEvent.click(container.querySelector('.btn-exit-workout'));
        expect(onExit).toHaveBeenCalled();
        expect(localStorage.getItem('ffit_workout_payload')).toBeNull();
    });

    it('handleFinish limpia localStorage y llama a onFinish con el payload acumulado', () => {
        const onFinish = vi.fn();
        render(<WorkoutView session={sesionEstandar()} onFinish={onFinish} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '80' } });
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({
            e1: expect.objectContaining({ pesoActual: '80' })
        }));
        expect(localStorage.getItem('ffit_workout_payload')).toBeNull();
    });

    it('una sesión vacía (sin bloques) puede "finalizarse" igual, mandando un payload vacío — no hay guardia contra entrenamientos vacíos', () => {
        const onFinish = vi.fn();
        render(<WorkoutView session={sesionEstandar({ bloques: [] })} onFinish={onFinish} onExit={() => {}} />);
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        expect(onFinish).toHaveBeenCalledWith({});
    });

    it('un `ffit_workout_payload` viejo en localStorage (formato plano, de antes de este cambio) se migra solo, sin crashear', () => {
        // Simula un entrenamiento que quedó a mitad de camino justo cuando
        // se actualizó la app: el formato viejo era { ejId: "55" } (un
        // string plano), no { ejId: { series, pesoActual, repsActual } }.
        localStorage.setItem('ffit_workout_payload', JSON.stringify({ e1: '55' }));
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        // El peso viejo se recupera como punto de partida de la serie 1.
        expect(screen.getByLabelText(/Peso serie 1/)).toHaveValue(55);
    });
});

describe('WorkoutView — NUEVO: carga de peso y repeticiones por serie (pedido del cliente)', () => {
    it('"Finalizar Serie" confirma el peso/reps tipeados como la serie actual, y los muestra como chip', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '40' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1/), { target: { value: '10' } });
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));

        expect(screen.getByText('S1 · 40kg × 10')).toBeInTheDocument();
    });

    it('al pasar a la siguiente serie, el peso queda PRECARGADO con el de la serie anterior, pero las reps arrancan vacías', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '40' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1/), { target: { value: '10' } });
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));

        expect(screen.getByLabelText(/Peso serie 2/)).toHaveValue(40);
        expect(screen.getByLabelText(/Repeticiones serie 2/)).toHaveValue(null);
    });

    it('el peso varía serie a serie: cada una queda guardada con SU propio valor, no todas con el último', () => {
        const onFinish = vi.fn();
        render(<WorkoutView session={sesionEstandar()} onFinish={onFinish} onExit={() => {}} />);

        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '40' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1/), { target: { value: '10' } });
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        fireEvent.change(screen.getByLabelText(/Peso serie 2/), { target: { value: '45' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 2/), { target: { value: '6' } });
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        fireEvent.change(screen.getByLabelText(/Peso serie 3/), { target: { value: '42' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 3/), { target: { value: '8' } });
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));

        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));
        const payload = onFinish.mock.calls[0][0];
        expect(payload.e1.series.map(s => s.peso)).toEqual([40, 45, 42]);
    });

    it('en un bloque de circuito NO se pide repeticiones (son sets por tiempo, no por reps)', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'circuit', vueltas: 2, ejercicios: [{ id: 'e1', nombre: 'Burpees', tiempo: '20' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.getByLabelText(/Peso serie 1/)).toBeInTheDocument();
        expect(screen.queryByLabelText(/Repeticiones/)).not.toBeInTheDocument();
    });

    it('un superset con dos ejercicios: cada uno guarda SU propia serie por separado, no se mezclan', () => {
        const onFinish = vi.fn();
        const session = sesionEstandar({
            bloques: [{ tipo: 'superset', descanso: 30, ejercicios: [{ id: 'e1', nombre: 'A' }, { id: 'e2', nombre: 'B' }] }]
        });
        render(<WorkoutView session={session} onFinish={onFinish} onExit={() => {}} />);

        fireEvent.change(screen.getByLabelText(/Peso serie 1 — A/), { target: { value: '20' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1 — A/), { target: { value: '12' } });
        fireEvent.change(screen.getByLabelText(/Peso serie 1 — B/), { target: { value: '15' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1 — B/), { target: { value: '12' } });
        fireEvent.click(screen.getByText(/FINALIZAR SERIE/));
        fireEvent.click(screen.getByText(/FINALIZAR ENTRENAMIENTO/));

        const payload = onFinish.mock.calls[0][0];
        expect(payload.e1.series[0].peso).toBe(20);
        expect(payload.e2.series[0].peso).toBe(15);
    });
});

describe('WorkoutView — NUEVO: las repeticiones son obligatorias (al menos 1) para poder finalizar la serie', () => {
    it('sin cargar ninguna repetición, "Finalizar Serie" queda deshabilitado y muestra el aviso', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '40' } });

        expect(screen.getByText(/FINALIZAR SERIE/)).toBeDisabled();
        expect(screen.getByText(/Cargá las repeticiones/i)).toBeInTheDocument();
    });

    it('con 0 repeticiones tampoco alcanza — tiene que ser al menos 1', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '40' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1/), { target: { value: '0' } });

        expect(screen.getByText(/FINALIZAR SERIE/)).toBeDisabled();
    });

    it('cargando 1 repetición (o más), el botón se habilita y el aviso desaparece', () => {
        render(<WorkoutView session={sesionEstandar()} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Peso serie 1/), { target: { value: '40' } });
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1/), { target: { value: '1' } });

        expect(screen.getByText(/FINALIZAR SERIE/)).not.toBeDisabled();
        expect(screen.queryByText(/Cargá las repeticiones/i)).not.toBeInTheDocument();
    });

    it('en un circuito, esta validación no aplica — se puede finalizar la vuelta sin ningún campo de reps (no existe)', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'circuit', vueltas: 1, ejercicios: [{ id: 'e1', nombre: 'Burpees', tiempo: '20' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        expect(screen.getByText(/FINALIZAR VUELTA/)).not.toBeDisabled();
    });

    it('en un superset, si a UNO de los dos ejercicios le faltan las reps, el botón sigue deshabilitado (aplica a todo el bloque)', () => {
        const session = sesionEstandar({
            bloques: [{ tipo: 'superset', descanso: 30, ejercicios: [{ id: 'e1', nombre: 'A' }, { id: 'e2', nombre: 'B' }] }]
        });
        render(<WorkoutView session={session} onFinish={() => {}} onExit={() => {}} />);
        fireEvent.change(screen.getByLabelText(/Repeticiones serie 1 — A/), { target: { value: '12' } });
        // B se deja sin cargar.
        expect(screen.getByText(/FINALIZAR SERIE/)).toBeDisabled();
    });
});
