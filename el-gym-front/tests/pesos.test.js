import { describe, it, expect } from 'vitest';
import { sanitizarPesoInput, parsePeso, formatPeso, pesoAnteriorDe, normalizarNombreEjercicio } from '../src/Utils/pesos';

describe('pesos — sanitizarPesoInput', () => {
    it('deja pasar enteros, decimales con coma y con punto', () => {
        expect(sanitizarPesoInput('40')).toBe('40');
        expect(sanitizarPesoInput('42,5')).toBe('42,5');
        expect(sanitizarPesoInput('42.5')).toBe('42.5');
    });
    it('permite un separador suelto al final (mientras todavía está tipeando)', () => {
        expect(sanitizarPesoInput('42,')).toBe('42,');
    });
    it('descarta letras, signos, espacios y separadores de más', () => {
        expect(sanitizarPesoInput('4a2,5,7-')).toBe('42,57');
        expect(sanitizarPesoInput('-5')).toBe('5');
        expect(sanitizarPesoInput(' 1 0 ')).toBe('10');
    });
    it('limita a 2 decimales', () => {
        expect(sanitizarPesoInput('10,123')).toBe('10,12');
    });
    it('null/undefined → vacío', () => {
        expect(sanitizarPesoInput(undefined)).toBe('');
        expect(sanitizarPesoInput(null)).toBe('');
    });
});

describe('pesos — parsePeso', () => {
    it('convierte coma y punto a número', () => {
        expect(parsePeso('42,5')).toBe(42.5);
        expect(parsePeso('42.5')).toBe(42.5);
        expect(parsePeso(42.5)).toBe(42.5);
        expect(parsePeso('40')).toBe(40);
    });
    it('lo que no es un peso válido (vacío, texto, negativo, cero) vale 0', () => {
        expect(parsePeso('')).toBe(0);
        expect(parsePeso('abc')).toBe(0);
        expect(parsePeso('-3')).toBe(0);
        expect(parsePeso(null)).toBe(0);
        expect(parsePeso(undefined)).toBe(0);
        expect(parsePeso(NaN)).toBe(0);
    });
});

describe('pesos — formatPeso', () => {
    it('los enteros se ven igual que siempre', () => {
        expect(formatPeso(40)).toBe('40');
        expect(formatPeso(800)).toBe('800');
        expect(formatPeso(0)).toBe('0');
    });
    it('los decimales van con coma, sin ceros de más', () => {
        expect(formatPeso(42.5)).toBe('42,5');
        expect(formatPeso(42.25)).toBe('42,25');
    });
    it('redondea el ruido de punto flotante (ej. 42.1 × 3)', () => {
        expect(formatPeso(42.1 * 3)).toBe('126,3');
    });
});

describe('pesos — pesoAnteriorDe', () => {
    it('normaliza el nombre', () => {
        expect(normalizarNombreEjercicio('  Press BANCA ')).toBe('press banca');
    });
    it('historial vacío / inválido / sin nombre → null', () => {
        expect(pesoAnteriorDe([], 'Press')).toBeNull();
        expect(pesoAnteriorDe(undefined, 'Press')).toBeNull();
        expect(pesoAnteriorDe([{ ejercicios: [{ nombre: 'Press', pesoUsado: 40 }] }], '')).toBeNull();
    });
    it('un ejercicio que nunca hizo → null', () => {
        expect(pesoAnteriorDe([{ createdAt: '2026-01-01', ejercicios: [{ nombre: 'Remo', pesoUsado: 40 }] }], 'Press')).toBeNull();
    });
    it('sin createdAt en los logs no crashea y respeta el orden recibido', () => {
        const h = [{ ejercicios: [{ nombre: 'Press', pesoUsado: 40 }] }, { ejercicios: [{ nombre: 'Press', pesoUsado: 30 }] }];
        expect(pesoAnteriorDe(h, 'Press')).toBe(40);
    });
});
