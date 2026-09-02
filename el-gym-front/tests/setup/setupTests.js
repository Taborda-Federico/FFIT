// tests/setup/setupTests.js
//
// Setup global para toda la suite de Vitest + Testing Library.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// SEGURIDAD DE LA SUITE: cada service del frontend (plan.service.js,
// student.service.js, user.service.js, admin.service.js, auth.service.js,
// landing.service.js, y api.config.js/gym.service.js) tiene hardcodeada
// la URL de PRODUCCIÓN (https://ffit.onrender.com/api) — no hay ninguna
// variable de entorno que la cambie para la mayoría de esos archivos (ver
// hallazgos del reporte). Si un test se olvida de mockear `fetch`, NO debe
// poder pegarle a la API real por accidente: acá lo dejamos fallando fuerte
// por default, y cada test que sí necesite red lo pisa con su propio mock.
beforeEach(() => {
    global.fetch = vi.fn(() => {
        throw new Error(
            'Test intentó llamar a fetch() real sin mockearlo. ' +
            'Si esto pasa, revisá que el test esté mockeando global.fetch ' +
            '(nunca debe salir tráfico real hacia ffit.onrender.com desde un test).'
        );
    });
});

afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    // Red de seguridad: si un test llama a vi.useFakeTimers() y se cuelga o
    // falla ANTES de su propio vi.useRealTimers(), el reloj falso queda
    // "pegado" y arruina (cuelga) TODOS los tests siguientes del archivo —
    // waitFor() de Testing Library nunca vuelve a resolver porque su propio
    // polling interno usa setTimeout/setInterval, que quedan congelados.
    vi.useRealTimers();
});

// jsdom no implementa ResizeObserver (lo usa recharts ResponsiveContainer).
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// jsdom no implementa navigator.vibrate (lo usa WorkoutView.jsx).
if (!window.navigator.vibrate) {
    Object.defineProperty(window.navigator, 'vibrate', { value: vi.fn(), writable: true, configurable: true });
}
