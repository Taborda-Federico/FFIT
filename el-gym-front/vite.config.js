import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/setupTests.js'],
    css: false,
    include: ['tests/**/*.test.{js,jsx}'],
    // FFIT+ es una app para un gimnasio en Argentina — fijamos el huso
    // horario de los tests a Argentina siempre, sin importar en qué máquina
    // corran (acá, en CI, o en la de cualquier otra persona). Sin esto, un
    // test que documenta un bug específico de zona horaria (ver
    // HistoryView.test.jsx, "BUG DE ZONA HORARIA") da resultados distintos
    // según el huso horario del sistema operativo que ejecute la suite — en
    // un runner de CI en UTC ese bug ni siquiera se manifiesta.
    env: { TZ: 'America/Argentina/Buenos_Aires' },
  },
})
