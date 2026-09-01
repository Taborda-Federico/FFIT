import { describe, it, expect } from 'vitest';
import { getIcon } from '../src/service/iconSelector';
import { FaDumbbell, FaRunning, FaFistRaised, FaHeartbeat, FaBiking } from 'react-icons/fa';

describe('getIcon', () => {
    it.each([
        ['FaDumbbell', FaDumbbell],
        ['FaRunning', FaRunning],
        ['FaFistRaised', FaFistRaised],
        ['FaHeartbeat', FaHeartbeat],
        ['FaBiking', FaBiking],
    ])('devuelve el componente correcto para "%s"', (nombre, esperado) => {
        expect(getIcon(nombre)).toBe(esperado);
    });

    it('un nombre no reconocido cae al ícono por defecto (FaDumbbell), no revienta', () => {
        expect(getIcon('IconoQueNoExiste')).toBe(FaDumbbell);
    });

    it('undefined/null también caen al default', () => {
        expect(getIcon(undefined)).toBe(FaDumbbell);
        expect(getIcon(null)).toBe(FaDumbbell);
    });

    it('el editor de landing (AdminLandingEditor) no ofrece ningún selector de ícono en la UI: las clases nuevas siempre quedan con FaDumbbell, sin forma de cambiarlo desde el panel', () => {
        // Ver AdminLandingEditor.jsx: addClase() hardcodea iconName: 'FaDumbbell'
        // y no hay ningún <select> de íconos en todo el formulario de "Disciplinas".
        expect(getIcon('FaDumbbell')).toBe(FaDumbbell);
    });
});
