// playwright.config.js
//
// e2e "de verdad": navegador real + frontend real (Vite dev server) +
// backend real (Express + Mongo en memoria, ver ../el-gym-back/tests/e2eServer.js).
//
// El frontend tiene hardcodeada la URL de producción (https://ffit.onrender.com/api)
// en casi todos sus services (ver reporte) — para poder testear contra
// nuestro backend local SIN tocar ese código fuente, cada test intercepta
// esas requests con page.route() y las reenvía al backend e2e local
// (ver tests-e2e/fixtures.js). Es la única forma de hacer e2e real sin
// modificar el comportamiento de la app.
import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = 5180;
const BACKEND_PORT = 5057;

export default defineConfig({
    testDir: './tests-e2e',
    fullyParallel: false, // comparten un único backend/Mongo en memoria
    workers: 1,
    retries: 0,
    timeout: 30000,
    reporter: [['list']],
    use: {
        baseURL: `http://localhost:${FRONTEND_PORT}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: [
        {
            command: `node ../el-gym-back/tests/e2eServer.js`,
            port: BACKEND_PORT,
            reuseExistingServer: false,
            timeout: 60000,
            env: { E2E_PORT: String(BACKEND_PORT) },
        },
        {
            command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
            port: FRONTEND_PORT,
            reuseExistingServer: false,
            timeout: 60000,
        },
    ],
});
