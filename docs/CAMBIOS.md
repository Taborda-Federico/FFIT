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
- `el-gym-back/tests/e2eServer.js` tenía la MISMA ruta hardcodeada (`/usr/bin/mongod`) que `db.js`, en un
  lugar aparte que se me había pasado por alto — mismo arreglo: usar el mongod del sistema si existe, si
  no dejar que se descargue solo.
- Un test e2e (`admin-students.spec.js`, "crear un socio completo") era medio inestable: justo después de
  guardar un alumno, su nombre aparece dos veces en pantalla a la vez — en el toast de éxito y en la fila
  nueva de la tabla. En esta máquina el toast ya se había cerrado para cuando corría la aserción; en el
  runner de CI (más lento en arrancar el navegador) todavía estaba visible, y Playwright se quejó de
  ambigüedad. Se corrigió buscando puntualmente dentro de la tabla.

Con estos ajustes, los tres jobs (backend, frontend, e2e) quedaron en verde en GitHub Actions.

---

## 2 — El constructor de planes ya no se borra al navegar a otra pestaña (ni con F5)

**El bug, tal como lo reportó un cliente real:** "hago los planes y por ahí hago otras cosas, y si pasa un
tiempo después no me deja cargar la rutina, la tengo que rehacer toda."

**Qué pasaba:** el formulario de armado de planes (`AdminDashboard.jsx`) guardaba todo lo que se iba
tipeando —títulos, días, bloques, ejercicios— únicamente en memoria de React (`useState`), sin persistirlo
en ningún lado. Apenas la pantalla se desmontaba, ese estado se perdía para siempre. Y se desmontaba con
cualquiera de estas dos cosas:

1. Recargar la página (F5).
2. **Tocar cualquier otra pestaña del menú** ("Alumnos", "Editor Web", "Seguimiento") y volver a "Planes"
   — aunque no se tocara F5 en ningún momento. Esto es, casi seguro, lo que le pasaba al cliente: ir a
   mirar el DNI o el progreso de un alumno mientras se arma su plan es un gesto normal de cualquier
   profesor, y bastaba con eso.

El lado del **alumno** ya tenía esta protección desde antes (`UserDashboard.jsx` guarda el entrenamiento
activo en `localStorage` para no perderlo si se recarga la página a mitad de una serie) — el lado del
**profesor** nunca la tuvo.

**La solución:** el plan que se está armando ahora se guarda en `localStorage` cada vez que cambia algo
(`useEffect` que corre en cada cambio de `plan`), bajo la clave `ffit_admin_plan_draft_<id del admin>`
(separado por admin, para que en una compu compartida por varios profes el borrador de uno no se mezcle
con el de otro). Al montar la pantalla, en vez de arrancar siempre en blanco, primero busca si hay un
borrador guardado y lo recupera — mismo patrón que ya se usaba del lado del alumno, aplicado acá. El
borrador se borra en un solo momento: cuando el plan se publica con éxito (ahí sí termina el ciclo de vida
de *ese* borrador en particular). Guardar como plantilla **no** lo borra — el profe puede seguir editando
el mismo plan después de guardar una copia de referencia.

**Por qué no se agregó ningún aviso tipo "recuperamos tu borrador"**: se pidió explícitamente no tocar
nada visible en esta etapa. La recuperación es silenciosa, igual que ya lo es del lado del alumno.

**Tests:**
- 6 tests nuevos en `AdminDashboard.test.jsx`: se guarda al tipear, sobrevive a un desmontaje/remontaje
  (navegación), sobrevive a un remontaje que simula un F5, se borra al publicar con éxito, NO se borra al
  guardar plantilla, y un JSON corrupto en `localStorage` no rompe la pantalla.
- 2 tests e2e nuevos en `admin-plan-builder.spec.js`, en un navegador real: uno navega de verdad por el
  menú (Planes → Alumnos → Planes) y confirma que el plan sigue ahí; el otro hace un `page.reload()` real
  (el equivalente exacto de un F5) y confirma lo mismo.

**Riesgo para la app en producción:** bajo. Es un cambio puramente aditivo (nada se deja de guardar en el
servidor como antes; solo se agrega una copia de seguridad en el navegador mientras se arma el plan). Si
`localStorage` no está disponible (modo incógnito con storage bloqueado, por ejemplo), el guardado falla
en silencio y el formulario sigue funcionando exactamente como antes — no persiste el borrador, pero no se
rompe nada.

---

## 3 — Un hueco de seguridad real (IDOR) y cinco archivos de código muerto

### El IDOR: un alumno podía marcar como leída la notificación de otro alumno

**Qué pasaba:** `PUT /api/student/notifications/:id/read` actualizaba la notificación buscándola solo por
`id`, sin chequear que fuera del alumno que hacía el pedido. Cualquier alumno logueado, probando ids (los
de Mongo son bastante predecibles: tienen un componente de timestamp), podía marcar como leída una
notificación ajena — por ejemplo, silenciar en secreto el aviso de "tu cuota vence en 5 días" de otro
alumno.

**La solución:** el `findByIdAndUpdate` pasó a ser un `findOneAndUpdate` que filtra también por
`alumnoId: req.user._id`. Si la notificación no existe O no es del alumno que pide, devuelve 404 — mismo
criterio que ya se usaba en el resto del backend para casos de "no es tuyo" (`renewSubscription`,
`deleteStudent`, etc., todos devuelven 404 en vez de un 403 que confirmaría que el id existe).

**Tests:** se dio vuelta el test que antes documentaba el bug (ahora confirma que da 404 y que la
notificación de la víctima queda intacta), y se agregaron dos más: que un alumno sí puede marcar como
leída su propia notificación, y que un id inexistente también da 404.

### Código muerto borrado

Cinco archivos que ya no hacía nada nadie, confirmados inalcanzables antes de tocarlos (se re-verificó con
grep que ninguno se importaba desde ningún lugar real de la app, y se corrió `npm run build` después de
borrarlos para confirmar que el bundle sigue compilando limpio):

- **`AdminRegister.jsx`** (frontend) — un "modo dios" de admin puramente client-side: con solo tipear
  cualquier cosa en dos campos, guardaba `role: 'GOD_MODE'` en `localStorage` sin preguntarle nada al
  servidor. Nunca estuvo conectado a ninguna ruta de `App.jsx`, así que hoy no se podía llegar a esta
  pantalla desde ningún link — pero seguía viviendo en el código, a una línea de distancia de que alguien
  lo conectara sin saber lo que hacía.
- **`UserContext.js`** (frontend) — una segunda implementación completa de login/sesión, con su propia
  clave de `localStorage` (`gym_session`, distinta de la real, `ffit_user`). Ningún archivo la importaba.
- **`AdminFinanceDashboard.jsx` + `gym.service.js` + `api.config.js`** (frontend) — una pantalla de
  Finanzas totalmente armada (ingresos, pagos pendientes, recibos), pero la ruta `/admin/finanzas` en
  `App.jsx` renderizaba un `<div>Finanzas</div>` fijo en vez de esta pantalla, y aunque se conectara
  fallaría igual: sus casi 25 llamadas apuntan a rutas (`/api/pagos`, `/api/stats`, `/api/attendance`,
  `/api/exercises`, `/api/templates`...) que nunca existieron en el backend.
- **`studentController.getStudentProgressForAdmin`** (backend) — una segunda copia, rota (usaba
  `AdminNote` sin importarlo), de algo que ya está bien hecho en `adminController.getStudentProgress`
  (conectado a `/api/admin/student-progress/:id`). Ni siquiera estaba exportada del archivo — imposible de
  alcanzar de ninguna forma.

**Por qué borrar en vez de arreglar:** en los cuatro casos había una versión real y en uso haciendo lo
mismo (el login real usa `AuthContext.jsx`; el progreso de alumno usa `adminController.js`), o directamente
no había ningún backend real detrás (Finanzas). Dejar dos formas de hacer lo mismo — una viva, una fantasma
— es una fuente de bugs futuros esperando pasar (alguien edita la copia equivocada y se pregunta por qué
"no pasa nada").

**Riesgo para la app en producción:** el código muerto, cero — no cambia nada de lo que ya andaba. El
arreglo del IDOR sí cambia comportamiento real: antes de este cambio, `PUT .../read` con el id de la
notificación de OTRO alumno respondía 200; ahora responde 404. Si algún cliente actual dependiera
accidentalmente de ese comportamiento (no debería — no hay ninguna razón legítima para que el frontend le
pegue a un id que no es del alumno logueado), dejaría de funcionar esa llamada puntual; el resto de la app
no se ve afectado.

---

## 4 — Los tres bugs de "los días de la semana"

Los tres arreglos de esta sección son cambios de **cálculo en pantalla**, no de datos: ningún
`WorkoutLog`, `Plan` ni nada guardado en Mongo se toca, se borra ni se reescribe. Se sigue leyendo
exactamente el mismo historial de entrenamientos que ya existe (con meses de uso real detrás) — lo único
que cambia es cómo se interpreta la fecha al decidir qué mostrar. Para un alumno esto se siente como "algo
que se veía raro ahora se ve bien", no como que algo desapareció.

### HomeHub.jsx: la semana ahora se cuenta desde el lunes, no desde el domingo

**Qué pasaba:** `isSessionCompleted` usaba `hoy.getDay()` (0=domingo...6=sábado) directo como "días a
restar" para encontrar el inicio de la semana — eso arranca la semana en domingo. El resto de la app
(`Horarios.jsx`, la grilla pública de clases) y la convención real en Argentina cuentan la semana de lunes
a domingo. Resultado: una sesión entrenada el domingo seguía marcada "COMPLETADA" el lunes siguiente (para
el alumno ya debería ser una semana nueva), y a la inversa, una sesión del lunes se "olvidaba" un día antes
de tiempo, el domingo.

**La solución:** se cambió la fórmula de "días a restar" de `diaDeLaSemana` a `(diaDeLaSemana + 6) % 7`,
que da 0 para el lunes, 1 para el martes, ..., 6 para el domingo — o sea, cuenta la semana desde el lunes.

### HistoryView.jsx: la racha ya no se corta por una mezcla de UTC y hora local

**Qué pasaba** (ver reporte de auditoría para el detalle técnico completo): `calcularRacha` sacaba la
fecha de cada entrenamiento en UTC y después la volvía a interpretar como si fuera hora local, corriendo
un día la validación de "¿entrenaste hace más de 48hs?" — específicamente en husos horarios detrás de UTC,
como Argentina. Entrenar ayer podía mostrar racha en 0 en vez de mantenerla.

**La solución:** dos funciones nuevas, `fechaLocalISO` y `parsearFechaLocal`, que arman y leen las fechas
siempre en hora local, sin ningún paso intermedio por UTC.

### AdminDashboard.jsx: el link de WhatsApp ahora sí lleva el número del alumno

**Qué pasaba:** al elegir un alumno de la búsqueda, se guardaba `a.celular` — un campo que no existe en el
modelo de alumno (se llama `telefono`) — así que el link de WhatsApp después de publicar un plan siempre
caía al genérico, sin ningún contacto preseleccionado.

**La solución:** una línea: leer `a.telefono` en vez de `a.celular`.

**Tests:** se dieron vuelta los tests que documentaban los tres bugs (ahora confirman el comportamiento
correcto) y se agregó uno nuevo (`HomeHub`: una sesión del lunes sigue completada hasta el domingo de esa
misma semana). Los tests e2e de "días de la semana" se corrieron además con el huso horario del sistema
forzado a UTC, para confirmar que el arreglo no depende de en qué máquina corra.

**Riesgo para la app en producción:** bajo, con un matiz a tener en cuenta el día que esto se despliegue:
un alumno que haya entrenado el domingo y entre a la app el lunes va a ver esa sesión "liberada" de nuevo
(antes la veía bloqueada) — es exactamente el comportamiento correcto, pero es un cambio visible en el
momento del deploy para quien esté mirando la app justo ese lunes. No hay ninguna pérdida de datos: el
entrenamiento del domingo sigue en el Historial tal cual quedó guardado.

---
