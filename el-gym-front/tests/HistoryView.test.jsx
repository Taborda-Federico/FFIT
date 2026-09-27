import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryView } from '../src/feactures/User/HistoryView';

// Igual que en HomeHub.test.jsx: semana de referencia fija y conocida.
// 2026-01-08 es jueves.
const HOY = '2026-01-08T12:00:00';
const AYER = '2026-01-07T12:00:00';
const ANTEAYER = '2026-01-06T12:00:00';
const HACE_3 = '2026-01-05T12:00:00';
const HACE_4 = '2026-01-04T12:00:00'; // rompe la racha si HOY está en el medio

function log(fechaIso, overrides = {}) {
    return { _id: fechaIso, nombreSesion: 'Día 1', duracion: '30m', createdAt: fechaIso, ejercicios: [], ...overrides };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(HOY)); });
afterEach(() => { vi.useRealTimers(); });

describe('HistoryView — cálculo de racha (calcularRacha)', () => {
    it('sin historial, racha = 0', () => {
        render(<HistoryView history={[]} />);
        expect(screen.getByText('0 d')).toBeInTheDocument();
    });

    it('un solo entrenamiento HOY → racha = 1', () => {
        render(<HistoryView history={[log(HOY)]} />);
        expect(screen.getByText('1 d')).toBeInTheDocument();
    });

    it('entrenamientos en 3 días consecutivos terminando hoy → racha = 3', () => {
        render(<HistoryView history={[log(HOY), log(AYER), log(ANTEAYER)]} />);
        expect(screen.getByText('3 d')).toBeInTheDocument();
    });

    it('una racha de 7 días consecutivos se cuenta completa', () => {
        const dias = [];
        for (let i = 0; i < 7; i++) {
            const f = new Date(HOY);
            f.setDate(f.getDate() - i);
            dias.push(log(f.toISOString()));
        }
        render(<HistoryView history={dias} />);
        expect(screen.getByText('7 d')).toBeInTheDocument();
    });

    it('un HUECO en la racha corta el conteo en el punto justo del hueco', () => {
        // hoy, ayer, anteayer, [salto: falta hace_3], hace_4 → racha = 3
        render(<HistoryView history={[log(HOY), log(AYER), log(ANTEAYER), log(HACE_4)]} />);
        expect(screen.getByText('3 d')).toBeInTheDocument();
    });

    it('si el último entrenamiento fue hace más de 48hs (2+ días), la racha es 0 aunque haya entrenamientos previos consecutivos', () => {
        // el entrenamiento más reciente es "hace_3" — desde hoy hay más de 1 día de diferencia
        render(<HistoryView history={[log(HACE_3), log(HACE_4)]} />);
        expect(screen.getByText('0 d')).toBeInTheDocument();
    });

    it('ARREGLADO (era bug de zona horaria): entrenar AYER mantiene la racha viva', () => {
        // Antes, calcularRacha mezclaba dos formas de fecha: obtenía el
        // string de fecha en UTC (`toISOString().split('T')[0]`) y después
        // lo volvía a parsear con `new Date('AAAA-MM-DD')` — que SIEMPRE se
        // interpreta como medianoche UTC. En un huso horario negativo
        // respecto a UTC (Argentina es UTC-3, y esta suite corre fijada a
        // America/Argentina/Buenos_Aires — ver vite.config.js), esa
        // medianoche UTC caía en la noche del día local ANTERIOR, corriendo
        // un día la validación "¿el último entreno fue hace más de 48hs?".
        // Ahora fechaLocalISO/parsearFechaLocal trabajan siempre en hora
        // local, sin ida y vuelta por UTC.
        render(<HistoryView history={[log(AYER), log(ANTEAYER)]} />);
        expect(screen.getByText('2 d')).toBeInTheDocument();
    });

    it('un entreno de HOY también conserva la racha', () => {
        render(<HistoryView history={[log(HOY), log(AYER)]} />);
        expect(screen.getByText('2 d')).toBeInTheDocument();
    });

    it('múltiples logs el MISMO día cuentan como un solo día para la racha (no se duplican)', () => {
        render(<HistoryView history={[log(HOY, { _id: 'a' }), log(HOY, { _id: 'b', nombreSesion: 'Día 2' })]} />);
        expect(screen.getByText('1 d')).toBeInTheDocument();
    });

    it('la racha soporta cruzar un límite de mes correctamente', () => {
        vi.setSystemTime(new Date('2026-02-01T12:00:00'));
        render(<HistoryView history={[log('2026-02-01T10:00:00'), log('2026-01-31T10:00:00'), log('2026-01-30T10:00:00')]} />);
        expect(screen.getByText('3 d')).toBeInTheDocument();
    });

    it('la racha soporta cruzar un límite de año correctamente', () => {
        vi.setSystemTime(new Date('2027-01-01T12:00:00'));
        render(<HistoryView history={[log('2027-01-01T10:00:00'), log('2026-12-31T10:00:00')]} />);
        expect(screen.getByText('2 d')).toBeInTheDocument();
    });
});

describe('HistoryView — tonelaje y tiempo total', () => {
    it('suma el peso usando `pesoUsado` (formato actual del backend)', () => {
        render(<HistoryView history={[log(HOY, { ejercicios: [{ pesoUsado: 40 }, { pesoUsado: 60 }] })]} />);
        expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('también suma correctamente si el ejercicio trae `peso` en vez de `pesoUsado` (fallback de compatibilidad)', () => {
        render(<HistoryView history={[log(HOY, { ejercicios: [{ peso: 25 }] })]} />);
        expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('parsea minutos desde el formato "Xm" de duracion y los suma', () => {
        render(<HistoryView history={[log(HOY, { duracion: '10m' }), log(AYER, { duracion: '20m' })]} />);
        expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('formatea el tiempo total en horas + minutos cuando supera los 60 minutos', () => {
        render(<HistoryView history={[log(HOY, { duracion: '75m' })]} />);
        expect(screen.getByText('1h 15m')).toBeInTheDocument();
    });

    it('formatea exactamente 60 minutos como "1h" sin minutos sobrantes', () => {
        render(<HistoryView history={[log(HOY, { duracion: '60m' })]} />);
        expect(screen.getByText('1h')).toBeInTheDocument();
    });

    it('una duracion en formato inesperado (sin coincidir "Xm") no rompe el cálculo, simplemente no suma minutos', () => {
        render(<HistoryView history={[log(HOY, { duracion: 'formato raro' })]} />);
        expect(screen.getByText('0m')).toBeInTheDocument();
    });

    it('ARREGLADO: con desglose por serie, el tonelaje es peso × repeticiones de cada serie (volumen real)', () => {
        render(<HistoryView history={[log(HOY, {
            ejercicios: [{ nombre: 'Press', series: [{ numero: 1, peso: 40, reps: 10 }, { numero: 2, peso: 40, reps: 10 }] }]
        })]} />);
        // 40×10 + 40×10 = 800, no 40 (que era lo que daba sumando solo el
        // peso "plano" de antes, sin multiplicar por repeticiones).
        expect(screen.getByText('800')).toBeInTheDocument();
    });

    it('una serie sin repeticiones cargadas cuenta como 1 repetición (no se pierde ese peso del cálculo)', () => {
        render(<HistoryView history={[log(HOY, {
            ejercicios: [{ nombre: 'Press', series: [{ numero: 1, peso: 40 }] }]
        })]} />);
        expect(screen.getByText('40')).toBeInTheDocument();
    });
});

describe('HistoryView — NUEVO: desglose de series en el detalle (pedido del cliente)', () => {
    it('un ejercicio CON series muestra cada una por separado, con la mejor marca destacada', () => {
        render(<HistoryView history={[log(HOY, {
            ejercicios: [{
                nombre: 'Press de Banca',
                series: [
                    { numero: 1, peso: 40, reps: 10 },
                    { numero: 2, peso: 45, reps: 6 },
                    { numero: 3, peso: 42, reps: 8 }
                ]
            }]
        })]} />);
        fireEvent.click(screen.getByText('Día 1'));

        expect(screen.getByText('Mejor: 45kg')).toBeInTheDocument();
        expect(screen.getByText(/S1/)).toBeInTheDocument();
        expect(screen.getByText(/S2/)).toBeInTheDocument();
        expect(screen.getByText(/S3/)).toBeInTheDocument();
    });

    it('una serie sin repeticiones no muestra el "× reps" (pero tampoco crashea)', () => {
        render(<HistoryView history={[log(HOY, {
            ejercicios: [{ nombre: 'Peso Muerto', series: [{ numero: 1, peso: 100 }] }]
        })]} />);
        fireEvent.click(screen.getByText('Día 1'));
        expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
        expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });

    it('un ejercicio SIN series (log viejo, de antes de este cambio) sigue mostrando el número único de siempre — sin crashear', () => {
        render(<HistoryView history={[log(HOY, {
            ejercicios: [{ nombre: 'Sentadilla', pesoUsado: 60 }]
        })]} />);
        fireEvent.click(screen.getByText('Día 1'));
        expect(screen.getByText('Sentadilla')).toBeInTheDocument();
        expect(screen.getAllByText('60').length).toBeGreaterThan(0);
        expect(screen.queryByText('Mejor:', { exact: false })).not.toBeInTheDocument();
    });

    it('un `series` numérico (uso viejo y distinto del campo, no un array) NO se confunde con el desglose nuevo', () => {
        // Antes de este cambio, algún dato podría tener `series` como
        // NÚMERO (cantidad de series pactadas, no el desglose real). Un
        // Array.isArray() explícito evita que eso se interprete como el
        // desglose nuevo.
        render(<HistoryView history={[log(HOY, {
            ejercicios: [{ nombre: 'Sentadilla', series: 4, pesoUsado: 100 }]
        })]} />);
        fireEvent.click(screen.getByText('Día 1'));
        expect(screen.getAllByText('100').length).toBeGreaterThan(0);
        expect(screen.queryByText('Mejor:', { exact: false })).not.toBeInTheDocument();
    });
});

describe('HistoryView — lista y detalle', () => {
    it('muestra los logs del más nuevo al más viejo (reverse)', () => {
        render(<HistoryView history={[log(HACE_4, { nombreSesion: 'Viejo' }), log(HOY, { nombreSesion: 'Nuevo' })]} />);
        const nombres = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
        expect(nombres[0]).toBe('Nuevo');
    });

    it('sin historial, muestra el estado vacío', () => {
        render(<HistoryView history={[]} />);
        expect(screen.getByText(/tu historial está vacío/i)).toBeInTheDocument();
    });

    it('al hacer click en un log, se abre el detalle con sus ejercicios', () => {
        render(<HistoryView history={[log(HOY, { ejercicios: [{ nombre: 'Sentadilla', series: 4, pesoUsado: 100 }] })]} />);
        fireEvent.click(screen.getByText('Día 1'));
        expect(screen.getByText('Sentadilla')).toBeInTheDocument();
        expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    });

    it('el botón de cerrar detalle vuelve a la lista', () => {
        const { container } = render(<HistoryView history={[log(HOY)]} />);
        fireEvent.click(screen.getByText('Día 1'));
        expect(screen.getByText('DESGLOSE DE CARGAS')).toBeInTheDocument();
        fireEvent.click(container.querySelector('.btn-close-detail'));
        expect(screen.queryByText('DESGLOSE DE CARGAS')).not.toBeInTheDocument();
    });

    it('un log sin ejercicios muestra el mensaje "sin detalles disponibles" en el detalle', () => {
        render(<HistoryView history={[log(HOY, { ejercicios: [] })]} />);
        fireEvent.click(screen.getByText('Día 1'));
        expect(screen.getByText(/no hay detalles de ejercicios disponibles/i)).toBeInTheDocument();
    });
});
