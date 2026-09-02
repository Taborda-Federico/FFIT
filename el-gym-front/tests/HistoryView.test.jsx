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

    it('BUG DE ZONA HORARIA: entrenar AYER debería mantener la racha viva, pero da 0 en un huso horario detrás de UTC (ej. Argentina)', () => {
        // calcularRacha mezcla dos formas de fecha: obtiene el string de fecha
        // en UTC (`toISOString().split('T')[0]`) y después lo vuelve a parsear
        // con `new Date('YYYY-MM-DD')` — que SIEMPRE se interpreta como
        // medianoche UTC. En un huso horario negativo respecto a UTC (Argentina
        // es UTC-3, y este entorno de tests corre en America/Cordoba), esa
        // medianoche UTC cae en la TARDE/NOCHE del día local ANTERIOR. El
        // `.setHours(0,0,0,0)` que sigue no corrige eso: solo pone en 00:00 el
        // día (ya corrido) en el que cayó. Resultado: "fechaReferencia" queda
        // un día antes de lo real, y la validación "¿el último entreno fue
        // hace más de 48hs?" se vuelve más estricta de lo que debería —
        // entrenar AYER (que debería mantener viva la racha) la rompe.
        render(<HistoryView history={[log(AYER), log(ANTEAYER)]} />);
        expect(screen.getByText('0 d')).toBeInTheDocument();
    });

    it('en cambio, un entreno de HOY sí conserva la racha (el corrimiento de -1 día "coincide" con el margen para el caso de hoy)', () => {
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
