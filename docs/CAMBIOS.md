# Registro de cambios — arreglo de bugs de FFIT+

Este documento explica, cambio por cambio, **qué se tocó y por qué**, en el orden en que se fue haciendo.
Es el complemento del reporte de auditoría (rama `qa/exhaustive-test-suite`, PR
[#6](https://github.com/Taborda-Federico/FFIT/pull/6)): ahí está el diagnóstico completo de cada bug con
su severidad y su test; acá va la explicación de cada solución, pensada para poder leerse sin tener que
adivinar el "por qué" mirando solo el diff.

**Regla de esta etapa:** solo se toca lógica que está mal o que no hace lo que debería. Nada de CSS, nada
de rediseño, nada visual — eso se conversa aparte, después. Cada entrada de este documento corresponde a
un PR, ya mergeado a `main`, con sus tests correspondientes en verde.

---

## 1 — CI: tests automáticos en cada PR (GitHub Actions)

**Qué se agregó:** `.github/workflows/tests.yml`, con tres jobs independientes que corren en cada Pull
Request y en cada push a `main`:

- **`backend`** — corre `npm test` en `el-gym-back` (los 240 tests de Jest).
- **`frontend`** — corre `npm test` en `el-gym-front` (los 239 tests de Vitest).
- **`e2e`** — instala Chromium y corre los 25 tests de Playwright (levanta el backend y el frontend reales
  y prueba la app de punta a punta en un navegador).

**Por qué ahora, antes que cualquier arreglo:** esta aplicación está en producción, con gente usándola
en el gimnasio ahora mismo, y no hay ningún ambiente de staging — todo indica que Vercel (frontend) y
Render (backend) redespliegan automáticamente apenas se mergea algo a `main`. Sin un chequeo automático,
la única red de seguridad sería correr los tests a mano antes de cada merge y confiar en no olvidarse. Con
esto, GitHub bloquea visualmente el estado de cada PR (✅/❌) y queda un historial de qué pasó en cada
cambio — es la base para poder trabajar con confianza en todo lo que sigue.

**Por qué se tocó `tests/helpers/db.js` y `el-gym-back/package.json` en el mismo PR:** el script de tests
del backend tenía hardcodeada la ruta `/usr/bin/mongod` (el Mongo instalado en esta máquina de desarrollo)
para no tener que descargarlo en cada corrida local. Los runners de GitHub Actions son máquinas limpias
que no tienen ese binario instalado — con la ruta hardcodeada, el job de backend habría fallado siempre en
CI, aunque funcionara perfecto en local. Se cambió `db.js` para que **busque** un Mongo del sistema y lo
use si existe (rápido, como hasta ahora en esta máquina), y si no existe, deje que
`mongodb-memory-server` descargue el suyo automáticamente (como va a pasar en cada corrida de CI). Cero
cambio de comportamiento para quien ya venía corriendo los tests acá; ahora además funciona en cualquier
máquina sin configuración previa — que es, en general, la idea correcta para un script que vive en el
repositorio y no en la config personal de una computadora.

**Tests:** ninguno nuevo (es infraestructura), pero se corrió la suite completa (backend + frontend) para
confirmar que el cambio en `db.js` no rompió nada — 240 + 239 tests en verde.

**Riesgo para la app en producción:** ninguno. No se tocó ni un archivo de `src/` de ninguno de los dos
paquetes.

**Ajustes tras la primera corrida real en GitHub Actions** (siempre pasa algo distinto entre "funciona en
mi máquina" y un runner limpio — por eso vale la pena documentarlo):

- El job `e2e` fallaba al instante: `actions/setup-node` con `cache: npm` busca un `package-lock.json` en
  la raíz del repo por defecto, pero cada app tiene el suyo en su propia carpeta. Se le pasó
  `cache-dependency-path` apuntando a los dos lockfiles.
- El job `frontend` fallaba en un solo test: el que documenta el bug de zona horaria de la racha
  (`HistoryView.test.jsx`, "BUG DE ZONA HORARIA"). Ese test asume que la máquina corre en el huso horario
  de Argentina — algo cierto en esta computadora de desarrollo, pero los runners de GitHub Actions usan
  UTC por defecto, y ese bug específicamente **no se manifiesta** en UTC (solo en husos detrás de UTC).
  Se fijó el huso horario de toda la suite de tests del frontend a `America/Argentina/Buenos_Aires`
  (`vite.config.js`, opción `test.env.TZ`) — no es solo un parche para que CI pase: como la app es para un
  gimnasio real en Argentina, tiene sentido que los tests corran siempre en ese huso, sin importar en qué
  máquina se ejecuten.

---
