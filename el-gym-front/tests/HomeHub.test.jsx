import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeHub } from '../src/feactures/User/HomeHub';

// Semana de referencia real y conocida, para no depender de qué día es "hoy"
// cuando se corre la suite: 2026-01-04 es domingo, 2026-01-05 es lunes, etc.
// (2026 arranca en jueves — Jan 1 jue, Jan 2 vie, Jan 3 sáb, Jan 4 dom...).
const DOM = '2026-01-04T20:00:00'; // domingo
const LUN = '2026-01-05T09:00:00'; // lunes (día siguiente al domingo de arriba)
const MAR = '2026-01-06T09:00:00';
const SAB_SIG = '2026-01-10T09:00:00'; // sábado de la MISMA semana dom-sáb
const DOM_SIG = '2026-01-11T09:00:00'; // domingo SIGUIENTE (empieza otra semana dom-sáb)

function dashboardData(overrides = {}) {
    return {
        user: {
            nombre: 'Fede Testing', estado: 'ACTIVO', diasRestantes: 20,
            ...overrides.user
        },
        stats: { sesionesCompletadas: 3, racha: 0, ...overrides.stats },
        plan: overrides.plan === null ? null : {
            titulo: 'Fuerza Nivel 1',
            createdAt: overrides.planCreatedAt || '2020-01-01T00:00:00',
            sesiones: overrides.sesiones || [
                { _id: 's1', nombre: 'Día 1', bloques: [{ ejercicios: [{ nombre: 'Press' }] }] },
                { _id: 's2', nombre: 'Día 2', bloques: [{ ejercicios: [{ nombre: 'Sentadilla' }] }] },
            ],
            ...overrides.plan
        }
    };
}

function historyWith(fechaIso, nombreSesion = 'Día 1') {
    return [{ _id: 'log1', nombreSesion, createdAt: fechaIso }];
}

function setNow(fechaIso) {
    vi.setSystemTime(new Date(fechaIso));
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('HomeHub — bug del límite de semana domingo-vs-lunes en isSessionCompleted', () => {
    it('BUG: una sesión entrenada el DOMINGO sigue marcada "COMPLETADA" al día siguiente, LUNES (nueva semana calendario Lun-Dom)', () => {
        setNow(LUN);
        render(<HomeHub dashboardData={dashboardData()} history={historyWith(DOM)} onStart={() => {}} />);
        const tarjetaDia1 = screen.getByText('Día 1').closest('.hub-session-card');
        expect(tarjetaDia1).toHaveTextContent('COMPLETADA');
        // Con semana lunes-primero (la convención real en Argentina), el
        // lunes ya debería ser una semana nueva y la sesión debería estar
        // libre de nuevo — pero isSessionCompleted usa getDay() con semana
        // domingo-primero, así que el domingo y el lunes siguiente caen en
        // el MISMO "bucket" de semana.
    });

    it('control: lunes y sábado de la MISMA ventana domingo-sábado sí conservan el check correctamente', () => {
        // Acá el bug NO se manifiesta: la ventana domingo-sábado que contiene
        // al lunes (dom 4 a sáb 10) todavía no "resetó" el sábado 10 — recién
        // resetea al llegar el domingo 11 (ver el test siguiente).
        setNow(SAB_SIG);
        render(<HomeHub dashboardData={dashboardData()} history={historyWith(LUN)} onStart={() => {}} />);
        const tarjetaDia1 = screen.getByText('Día 1').closest('.hub-session-card');
        expect(tarjetaDia1).toHaveTextContent('COMPLETADA');
    });

    it('BUG (dirección opuesta): una sesión entrenada el LUNES aparece "sin completar" al llegar el DOMINGO siguiente, aunque en una semana lunes-primero seguiría siendo la misma semana', () => {
        setNow(DOM_SIG);
        render(<HomeHub dashboardData={dashboardData()} history={historyWith(LUN)} onStart={() => {}} />);
        const tarjetaDia1 = screen.getByText('Día 1').closest('.hub-session-card');
        expect(tarjetaDia1).not.toHaveTextContent('COMPLETADA');
    });

    it('control: dentro de la MISMA ventana domingo-sábado, el check SÍ persiste correctamente (martes marcado, visto el sábado)', () => {
        setNow(SAB_SIG);
        render(<HomeHub dashboardData={dashboardData()} history={historyWith(MAR)} onStart={() => {}} />);
        const tarjetaDia1 = screen.getByText('Día 1').closest('.hub-session-card');
        expect(tarjetaDia1).toHaveTextContent('COMPLETADA');
    });

    it.each([
        ['domingo', DOM], ['lunes', LUN], ['martes', MAR], ['sábado (semana siguiente)', SAB_SIG], ['domingo (semana siguiente)', DOM_SIG],
    ])('no explota en ningún día de la semana como "hoy" (%s)', (_, fechaHoy) => {
        setNow(fechaHoy);
        expect(() => render(<HomeHub dashboardData={dashboardData()} history={historyWith(DOM)} onStart={() => {}} />)).not.toThrow();
    });
});

describe('HomeHub — bloqueo de "ya entrenaste hoy" (yaEntrenoHoy)', () => {
    it('si ya se entrenó hoy, las sesiones NO completadas quedan bloqueadas ("ESPERA A MAÑANA") y no disparan onStart', () => {
        setNow(LUN);
        const onStart = vi.fn();
        render(<HomeHub dashboardData={dashboardData()} history={historyWith(LUN, 'Día 1')} onStart={onStart} />);
        const tarjetaDia2 = screen.getByText('Día 2').closest('.hub-session-card');
        expect(tarjetaDia2).toHaveTextContent('ESPERA A MAÑANA');
        fireEvent.click(tarjetaDia2);
        expect(onStart).not.toHaveBeenCalled();
    });

    it('si NO se entrenó hoy, una sesión pendiente dispara onStart al hacer click', () => {
        setNow(LUN);
        const onStart = vi.fn();
        render(<HomeHub dashboardData={dashboardData()} history={[]} onStart={onStart} />);
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('una sesión ya COMPLETADA no dispara onStart aunque se le haga click (queda bloqueada igual)', () => {
        setNow(LUN);
        const onStart = vi.fn();
        render(<HomeHub dashboardData={dashboardData()} history={historyWith(LUN, 'Día 1')} onStart={onStart} />);
        fireEvent.click(screen.getByText('Día 1').closest('.hub-session-card'));
        expect(onStart).not.toHaveBeenCalled();
    });
});

describe('HomeHub — nombres de sesión duplicados (colisión al agregar/borrar días en el builder)', () => {
    it('BUG: dos sesiones con el mismo nombre en el plan — completar una las marca a AMBAS como hechas', () => {
        setNow(LUN);
        const data = dashboardData({
            sesiones: [
                { _id: 's1', nombre: 'Día 3', bloques: [] },
                { _id: 's2', nombre: 'Día 3', bloques: [] },
            ]
        });
        render(<HomeHub dashboardData={data} history={historyWith(LUN, 'Día 3')} onStart={() => {}} />);
        const tarjetas = screen.getAllByText('Día 3').map(el => el.closest('.hub-session-card'));
        expect(tarjetas).toHaveLength(2);
        expect(tarjetas[0]).toHaveTextContent('COMPLETADA');
        expect(tarjetas[1]).toHaveTextContent('COMPLETADA');
    });
});

describe('HomeHub — casos generales de render', () => {
    it('sin dashboardData, no renderiza nada (return null) en vez de crashear', () => {
        const { container } = render(<HomeHub dashboardData={null} onStart={() => {}} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('sin plan asignado, muestra el estado vacío con el mensaje correspondiente', () => {
        setNow(LUN);
        render(<HomeHub dashboardData={dashboardData({ plan: null })} onStart={() => {}} />);
        expect(screen.getByText(/no tienes ninguna rutina asignada/i)).toBeInTheDocument();
    });

    it('con plan pero sin sesiones (array vacío), también muestra el estado vacío', () => {
        setNow(LUN);
        render(<HomeHub dashboardData={dashboardData({ sesiones: [] })} onStart={() => {}} />);
        expect(screen.getByText(/no tienes ninguna rutina asignada/i)).toBeInTheDocument();
    });

    it('una sesión con nombre vacío ("") renderiza una tarjeta sin título, sin crashear', () => {
        setNow(LUN);
        const data = dashboardData({ sesiones: [{ _id: 's1', nombre: '', bloques: [] }] });
        expect(() => render(<HomeHub dashboardData={data} onStart={() => {}} />)).not.toThrow();
    });

    it('muestra el conteo de bloques con ejercicios reales, ignorando bloques vacíos', () => {
        setNow(LUN);
        const data = dashboardData({
            sesiones: [{
                _id: 's1', nombre: 'Día 1',
                bloques: [{ ejercicios: [{ nombre: 'Press' }] }, { ejercicios: [] }, { ejercicios: [{ nombre: 'Curl' }] }]
            }]
        });
        render(<HomeHub dashboardData={data} onStart={() => {}} />);
        expect(screen.getByText('2 Bloques')).toBeInTheDocument();
    });

    it('estado VENCIDO muestra el badge en rojo y el texto de cuota vencida', () => {
        setNow(LUN);
        const data = dashboardData({ user: { nombre: 'X', estado: 'VENCIDO', diasRestantes: 0 } });
        render(<HomeHub dashboardData={data} onStart={() => {}} />);
        expect(screen.getByText('VENCIDO')).toBeInTheDocument();
        expect(screen.getByText(/cuota mensual está vencida/i)).toBeInTheDocument();
    });

    it('estado ACTIVO muestra "vence en N días"', () => {
        setNow(LUN);
        const data = dashboardData({ user: { nombre: 'X', estado: 'ACTIVO', diasRestantes: 12 } });
        render(<HomeHub dashboardData={data} onStart={() => {}} />);
        expect(screen.getByText(/vence en 12 días/i)).toBeInTheDocument();
    });

    it('el avatar muestra la inicial del nombre en mayúscula', () => {
        setNow(LUN);
        const data = dashboardData({ user: { nombre: 'federico', estado: 'ACTIVO', diasRestantes: 5 } });
        render(<HomeHub dashboardData={data} onStart={() => {}} />);
        expect(screen.getByText('F')).toBeInTheDocument();
    });

    it('el título muestra solo el primer nombre (split por espacio)', () => {
        setNow(LUN);
        const data = dashboardData({ user: { nombre: 'Federico Taborda', estado: 'ACTIVO', diasRestantes: 5 } });
        render(<HomeHub dashboardData={data} onStart={() => {}} />);
        expect(screen.getByText('Federico')).toBeInTheDocument();
    });

    it('sin ninguna sesión en el historial (racha/isSessionCompleted con history vacío), no marca nada como completado', () => {
        setNow(LUN);
        render(<HomeHub dashboardData={dashboardData()} history={[]} onStart={() => {}} />);
        expect(screen.queryByText('COMPLETADA')).not.toBeInTheDocument();
    });
});
