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

## 5 — El doble decremento de "semanas restantes" del plan

Este es el arreglo en el que más cuidado había que tener con los datos que ya existen: la app lleva meses
en uso y todos los planes activos ahora mismo ya vienen "arrastrando" este bug. Antes de tocar nada, la
pregunta que había que responder era: **¿esto puede hacer que algún plan pierda datos, o que el número que
ve un alumno salte de forma rara e inexplicable?** La respuesta, con el diseño elegido, es no — se explica
abajo por qué.

**Qué pasaba:** había DOS mecanismos separados descontándole vida al mismo plan:

1. El cron semanal (`cron/expirationCheck.js`, domingo 23:59) resta 1 a `plan.vencimiento` — esto SIEMPRE
   estuvo bien hecho, decrementa exactamente 1 por cada semana real que pasa. `plan.vencimiento`, tal cual
   está guardado en la base HOY para cualquier plan activo, es un número correcto y confiable.
2. `getStudentDashboard` (se ejecutaba en cada carga de pantalla del alumno) volvía a calcular una fecha de
   expiración DESDE CERO, como `createdAt + vencimiento_ACTUAL × 7 días` — el problema es que usaba el
   `vencimiento` que el cron YA había reducido, como si fuera el total original del plan. Cada semana que
   pasaba, el plan perdía casi el doble de vida útil de lo prometido (medido: un plan de 4 semanas se
   autodesactivaba a las 2).

**La solución:** se borra el mecanismo 2 por completo. `getStudentDashboard` ahora es una simple lectura:
muestra `plan.vencimiento` tal cual está guardado, sin recalcular nada ni volver a escribir en la base. El
cron pasa a ser el ÚNICO lugar que decrementa `vencimiento`, desactiva el plan al llegar a 0, y (nuevo)
también crea el aviso de "tu plan está por vencer" cuando queda justo 1 semana — ese aviso antes lo
disparaba el propio dashboard, con el riesgo de duplicarse si dos pedidos llegaban al mismo tiempo (dos
pestañas abiertas, por ejemplo); ahora corre una sola vez por semana, en un solo lugar, sin condición de
carrera posible.

**Por qué esto es seguro para los datos que ya existen — sin ninguna migración:**

- `plan.vencimiento` en la base, para cualquier plan activo, YA es el número correcto de "semanas
  restantes" (el cron nunca tuvo el bug — el bug estaba en cómo el dashboard lo interpretaba). No hace
  falta tocar ni un documento existente: el arreglo es puramente "dejar de recalcular mal", no "corregir
  un valor guardado".
- Los planes que el bug YA desactivó antes de este arreglo (los que se autodesactivaron a mitad de camino)
  **se dejan como están** — no se reactivan. Reactivar algo que lleva días o semanas marcado como
  finalizado sería un cambio más raro y más visible que dejarlo tal cual quedó; el arreglo es para que esto
  no le siga pasando a los planes activos de ahora en adelante, no para deshacer el pasado.
- Efecto visible esperado, y por qué es aceptable: un plan que YA tuvo al menos una corrida del cron va a
  mostrar, desde el momento del deploy, un número de "semanas restantes" más alto que el que mostraba el
  día anterior (porque el cálculo viejo achicaba de más). Es un ajuste único, siempre a favor del alumno
  (más semanas, nunca menos), y no involucra ningún dato perdido — el número anterior estaba mal, el nuevo
  está bien.

**Tests:** se dio vuelta toda la sección que documentaba el bug (la "curva" ahora es lineal:
4 → 3 → 2 → 1 → 0, no 4 → 2 → 0), se agregó un test que confirma que un `GET` al dashboard ya no escribe
nada en la base (ni siquiera bajo pedidos concurrentes), y los tests del aviso de "plan por vencer" se
movieron de `student.e2e.test.js` a `cron/expirationCheck.test.js`, que es donde vive esa lógica ahora.

244 backend en verde (242 frontend + 28 e2e sin cambios, no se tocó nada del lado del frontend — la forma
de la respuesta del dashboard es idéntica, solo cambia cómo se calcula el número adentro).

---

## 6 — Cuatro robusteces sueltas: mensajes de error, doble respuesta HTTP, contraseñas cortas y emails en cascada

Este batch junta cuatro arreglos chicos e independientes entre sí — no tocan datos existentes, ninguno
cambia lo que un usuario ve cuando todo sale bien, solo lo que pasa cuando algo sale mal.

**1. `RegisterUserModal.jsx` mostraba "undefined" en vez del mensaje real del backend.**

El código leía `err.response?.data?.message`, un patrón de Axios — pero este frontend usa `fetch`, no
Axios, así que `err.response` nunca existe. Cuando el backend rechazaba un registro (por ejemplo, DNI
duplicado) con un mensaje específico, el modal mostraba un genérico "Error al registrar socio" en vez del
mensaje real ("Ese DNI o email ya están registrados"). Se cambió a `err.message`, que es donde el `throw`
del `fetch` wrapper efectivamente deja el texto. Efecto: el admin ahora ve el motivo real del rechazo y
puede corregirlo sin adivinar.

**2. `authMiddleware.protect` podía responder dos veces a la misma request, y dejaba pasar tokens de usuarios borrados.**

Dos problemas en el mismo archivo:

- Un header `Authorization: Bearer` sin nada después del espacio hace que `jwt.verify(undefined, ...)` tire
  dentro del `try`. El `catch` respondía 401 — pero como a ningún `return` lo acompañaba, la función seguía
  ejecutando hasta el `if (!token)` de más abajo, que respondía 401 OTRA VEZ. En Express real esto dispara
  el error de Node "Cannot set headers after they are sent", que en el mejor caso es un log de warning y en
  el peor puede tirar abajo la request. Se agregó `return` antes de cada `res.status(...)` en la función.
- Un token válido y sin expirar de un usuario que mientras tanto fue borrado (ej. un admin elimina un
  alumno que en ese momento tiene la app abierta en el celular) dejaba pasar la request con
  `req.user = null`, porque nunca se chequeaba el resultado de `User.findById`. Los controllers que asumen
  que `req.user` existe explotaban con un 500 genérico. Ahora se corta ahí mismo con un 401 claro
  ("No autorizado, el usuario ya no existe"), que es lo que el frontend ya sabe interpretar como "andá de
  nuevo al login".

**3. Cambiar la contraseña aceptaba cualquier longitud si se le pegaba directo a la API.**

El mínimo de 6 caracteres solo existía en `ProfileView.jsx` (frontend) — una validación que cualquiera
puede saltear pegándole directo al endpoint `PUT /api/student/change-password` (con curl, Postman, etc.).
Se agregó la misma validación del lado del servidor, que es donde tiene que estar la que de verdad importa.
Un alumno legítimo usando la app no nota ningún cambio (el frontend ya frenaba esto antes); lo que cambia
es que ahora tampoco se puede saltear.

**4. El cron diario de "tu cuota vence en 5 días" se cortaba entero si UN solo email fallaba.**

El `try/catch` envolvía el `for` completo que recorre a todos los alumnos por vencer. Si el proveedor de
mail rechazaba la dirección de un solo alumno (email mal cargado, buzón lleno, lo que sea), el `catch`
atrapaba el error y el loop se cortaba ahí — todos los alumnos que venían DESPUÉS en la misma corrida se
quedaban sin `Notification` y sin intento de email, sin tener nada de malo ellos. Como el cron corre una
vez por día, esos alumnos directamente no se enteraban de que su cuota estaba por vencer esa semana. Se
movió el `try/catch` para que envuelva cada alumno individualmente: ahora una falla queda contenida a esa
persona (se loguea el error, con su id y su email, para poder revisarlo a mano) y el resto del batch sigue
procesándose con normalidad.

**Riesgo para la app en producción:** ninguno de los cuatro toca el esquema de datos ni requiere migración.
Los tres primeros solo agregan un freno donde antes no había ninguno (una respuesta de error más clara, una
validación que ya existía en el frontend, un `return` que evita un bug de Express); el cuarto solo cambia
el radio de qué tan lejos llega una falla, nunca la lógica de qué se le envía a cada alumno individual.

**Tests:** `RegisterUserModal.test.jsx` (mensaje de error) y el e2e de admin-students (DNI duplicado
mostrando el mensaje específico); `authMiddleware.test.js` (doble respuesta y usuario borrado, ambos
invertidos a partir de tests que antes documentaban el bug) más el `student.e2e.test.js` del dashboard con
usuario borrado (ahora 401 en vez de 500); `student.e2e.test.js` para el mínimo de contraseña (rechaza 1
caracter, acepta exactamente 6); `cron/expirationCheck.test.js` para el email en cascada (el alumno anterior
y el posterior al que falla ahora sí reciben su aviso).

245 backend en verde, 243 frontend, 28 e2e — sin tocar nada de lo visible cuando todo sale bien.

---

## 7 — El login (y el alta de socios) dejan de ser sensibles a mayúsculas en el email

**Qué pasaba:** el email se guarda en la base tal cual lo escribió quien lo cargó — no hay ningún
`lowercase: true` en el schema de `User`. Para Mongo, `"Juan@Gmail.com"` y `"juan@gmail.com"` son dos
strings distintos. En la práctica esto rompía el login real: un admin carga el email de un alumno con
mayúsculas (autocompletado del teclado, copiar y pegar de una tarjeta de socio, etc.), y el alumno —
escribiendo su propio email en minúsculas, lo más común en un celular — se encontraba con "Email o
contraseña incorrectos" a pesar de tener la contraseña perfecta. Mismo problema, en sentido inverso, en el
alta de un socio o admin nuevo: el chequeo de "¿ya existe este email?" tampoco veía que `"Dup@x.com"` y
`"dup@x.com"` eran la misma persona, así que dejaba crear dos cuentas para el mismo email real.

**La solución — por qué NO se tocó el dato guardado ni el schema:** la opción más obvia sería agregar
`lowercase: true` al campo `email` del modelo, o un índice único "case-insensitive" (`collation`) en Mongo.
Cualquiera de las dos requiere saber de antemano que, en la base real (meses de uso), no existen ya dos
cuentas cuyos emails difieren solo en mayúsculas — algo que no puedo verificar sin acceso directo a esa
base. Si existieran y se migrara igual, se podría chocar contra el índice único existente y romper cuentas
de gente que hoy usa la app. En cambio, se creó un helper (`src/utils/email.js`) que arma un regex
"ignorando mayúsculas" SOLO al momento de buscar (login, chequeo de duplicados en `register-admin`,
`create-admin` y el alta de alumnos) — el dato en la base no se toca para nada, cero riesgo de romper
cuentas existentes. Efecto colateral aceptado y documentado: si en la base YA existieran dos cuentas reales
que solo difieren en mayúsculas (algo que no tengo forma de confirmar de antemano), el login ahora
encontraría la primera que matchee en vez de fallar — un caso borde raro, mejor que el estado actual donde
ninguna de las dos podía loguearse de forma confiable con el casing "equivocado".

**De paso, un endurecimiento de seguridad:** el helper rechaza explícitamente (con 400/401) cualquier
`email` que no sea un string — por ejemplo, un operador de Mongo como `{ $gt: '' }` mandado a mano en el
body. Antes, ese tipo de payload dependía de que Mongoose lo casteara mal y tirara un error para no colar
(ver `tests/security/nosqlInjection.e2e.test.js`); ahora se corta explícitamente antes de que el valor
llegue a formar parte de ninguna query.

**Dónde se aplicó:** `POST /api/auth/login`, `POST /api/auth/register-admin`, `POST /api/auth/create-admin`
y `POST /api/users` (alta de alumnos) — los cuatro lugares donde se compara o busca por email. El `dni` no
se tocó (no tiene el mismo problema de mayúsculas).

**Tests:** se invirtió el test que documentaba el bug de login case-sensitive, se agregó uno que confirma
que el dato guardado en la base NO cambia de forma después de un login con otro casing, uno para el
chequeo de duplicados de `register-admin` y otro para el alta de alumnos, y uno que confirma que un email
no-string se rechaza sin llegar a la query.

249 backend en verde (243 frontend + 28 e2e sin cambios — este fix es puramente de backend).

---

## 8 — Colisión de sesiones con el mismo nombre dentro de un plan

**Qué pasaba:** nada, ni en el constructor de planes ni en el backend, impide que dos sesiones del MISMO
plan queden con el mismo `nombre` (un admin copia una sesión para no rearmarla de cero y se olvida de
renombrarla, por ejemplo — algo fácil de hacer sin querer). El problema es que `HomeHub.isSessionCompleted`
decidía si una sesión estaba "hecha" comparando `WorkoutLog.nombreSesion === session.nombre`, un match por
TEXTO. Si dos sesiones se llamaban igual, entrenar una las marcaba a las DOS como completadas — el alumno
veía una sesión que nunca entrenó mostrando "COMPLETADA" y el ícono de check.

**La solución:** cada sesión de un plan ya tenía, sin usarse para esto, un `_id` propio (Mongoose lo genera
solo para cada elemento de `plan.sesiones`). Ahora, al terminar un entrenamiento, el frontend manda también
ese `_id` (`sesionId`) junto con el nombre, y `WorkoutLog` lo guarda en un campo nuevo, OPCIONAL. En
`HomeHub`, el matching pasa a ser: si el log tiene `sesionId`, comparar por ahí (preciso, sin ambigüedad
posible); si no lo tiene, seguir comparando por nombre exactamente como antes.

**Por qué esto no toca ni un dato existente:** el campo `sesionId` en `WorkoutLog` es `required: false` — los
miles de entrenamientos ya registrados en la base siguen siendo válidos tal cual están, sin ningún campo
nuevo. Para esos logs viejos, el comportamiento es IDÉNTICO al de antes (matching por nombre) — la mejora
aplica únicamente hacia adelante, a los entrenamientos que se registren desde el deploy de este cambio. Es
el mismo criterio que ya se usó en el fix de "semanas restantes" (ver #5): mejorar sin migrar ni reescribir
historial.

**Tests:** se agregó un test de backend que confirma que `sesionId` se persiste cuando llega un ObjectId
válido, que se ignora sin romper el guardado si llega basura (defensa contra inyección), y que sigue
funcionando sin él (compatibilidad con el comportamiento viejo). En el frontend, `HomeHub.test.jsx` invierte
el test que documentaba el bug (ahora, con `sesionId`, solo la tarjeta correcta queda "COMPLETADA") y agrega
uno nuevo que confirma que los logs viejos sin `sesionId` siguen usando el matching por nombre. Y un e2e
nuevo (`session-collision.spec.js`) reproduce el escenario completo en un navegador real: dos sesiones
"Día 3", se entrena la primera, solo esa queda "COMPLETADA" — la segunda queda bloqueada por "ya
entrenaste hoy" (un mecanismo aparte), pero ya NO aparece como completada.

252 backend, 245 frontend, 29 e2e — todo en verde.

---

## 9 — NUEVO: modal "Gestionar Plantillas" (buscar, editar y borrar)

A diferencia de las secciones anteriores, esto no es el arreglo de un bug — es una funcionalidad nueva,
pedida directamente por el cliente: con el tiempo acumuló muchas plantillas guardadas, y el único lugar
para verlas era el `<select>` "Cargar Plantilla..." de arriba del armador — inmanejable para elegir algo
puntual, y sin ninguna forma de borrar las que ya no usa.

**Qué se agregó:**

- Un botón nuevo, "Plantillas", al lado del selector de siempre (que sigue exactamente igual — nada de lo
  que ya funcionaba se tocó). Abre un modal con: un buscador que filtra en vivo por título, y en cada
  plantilla, un botón de Editar y uno de Borrar.
- **Borrar**: pide confirmación (reutilizando el mismo `ConfirmModal` que ya usa el panel de alumnos para
  "eliminar socio" — mismo look, mismo patrón de doble confirmación) y después elimina la plantilla.
- **Editar**: acá había una decisión de diseño importante. Antes, la ÚNICA forma de "editar" una plantilla
  era cargarla en el armador y volver a guardarla — pero "Guardar Plantilla" siempre creaba una plantilla
  NUEVA, nunca pisaba la original. Es decir, lo que el admin probablemente interpretaba como "corregir" una
  plantilla en realidad la duplicaba silenciosamente — un sospechoso directo de por qué había "demasiadas"
  plantillas acumuladas. Ahora "Editar" carga la plantilla en el armador y muestra un aviso claro
  ("Editando una plantilla guardada — al guardar, se pisa la original"), con una "×" para salir del modo
  edición sin perder lo ya tipeado (por si el admin en realidad quería partir de esa plantilla para armar
  una distinta, no reemplazarla). Mientras está en modo edición, el botón cambia de "Guardar Plantilla" a
  "Guardar Cambios" y actualiza la plantilla existente en vez de crear una copia.

**Backend — dos endpoints nuevos, ambos con el mismo scoping por `adminId` que ya usa el resto de la API**
(un admin no puede ver, editar ni borrar una plantilla de otro):

- `PUT /api/planes/plantilla/:id` — actualiza título/notas/sesiones de una plantilla existente.
- `DELETE /api/planes/plantilla/:id` — la elimina.

Ninguno de los dos toca el modelo `Plan` ni requiere migración — son operaciones nuevas sobre documentos que
ya existen, con la misma forma de siempre.

**Por qué esto es seguro para lo que ya existe:** borrar una plantilla NO afecta a los planes ya publicados
a partir de ella (son documentos independientes en la base — un plan publicado es una copia de las sesiones
en el momento de publicar, no una referencia viva a la plantilla). El `<select>` "Cargar Plantilla..." del
armador sigue funcionando exactamente igual que siempre, para no romper el hábito ya aprendido por quien usa
la app a diario — el modal nuevo es un complemento, no un reemplazo.

**Diseño responsivo:** la lista de plantillas usa el mismo patrón de tarjetas que ya usa la tabla de
alumnos en mobile (botones de al menos 44px de alto, sin depender de hover). Probado en un navegador real a
320px y 375px de ancho, con y sin modal de confirmación de borrado encima.

**Tests:** 261 backend (12 nuevos: `PUT`/`DELETE` camino feliz, IDOR de cada uno, id inexistente, y que un
plan real — no plantilla — no se pueda tocar por esta ruta), 266 frontend (12 nuevos en `AdminDashboard.test.jsx`
para todo el flujo de edición/borrado/salida del modo edición, más 11 en un archivo nuevo dedicado,
`PlantillasModal.test.jsx`, para el componente aislado), y 35 e2e (2 nuevos en `admin-plan-builder.spec.js`
que reproducen el flujo completo en un navegador real — incluyendo que editar y guardar efectivamente pisa
la original y no duplica — más 4 nuevos en `admin-plan-builder-responsive.spec.js`, un archivo dedicado a
chequear que el armador de planes y este modal no tengan scroll horizontal ni controles cortados en
viewports de celular real).

---

## 10 — HOTFIX: el arreglo de "email case-insensitive" (#7) rompió el acceso de un admin real

**Qué pasó:** horas después de mergear el fix de email case-insensitive (sección 7), un cliente avisó que
una de sus cuentas admin más importantes dejó de poder entrar al panel — el login funcionaba (la
contraseña era aceptada), pero el sistema le decía "no sos administrador".

**La causa exacta era la que se había anotado como riesgo aceptado en la sección 7**, y se dio en la
práctica: en la base hay (al menos) dos cuentas cuyo email difiere solo en mayúsculas — la cuenta admin
real, y otra cuenta con el mismo email en otro casing. Antes del fix de la sección 7, el login buscaba por
coincidencia EXACTA, así que cada una encontraba siempre su propia cuenta, sin cruzarse nunca. Al pasar a
una búsqueda case-insensitive sin más cuidado, un `findOne` con ese regex puede devolver CUALQUIERA de las
dos cuentas que matcheen — Mongo no garantiza cuál gana cuando hay más de un documento posible. El admin
terminaba logueado con la cuenta equivocada.

**El arreglo:** en vez de buscar directo con el regex case-insensitive, el login ahora prueba PRIMERO una
coincidencia EXACTA (el comportamiento de toda la vida, que identifica sin ambigüedad la cuenta correcta
cuando existe una con ese casing preciso) — y solo si NINGUNA cuenta tiene ese casing exacto, recién ahí cae
al case-insensitive (que sigue resolviendo el caso original de la sección 7: alguien que escribe su email
con otro casing al que quedó guardado). Como red de seguridad extra, si todavía en ese fallback hay más de
una cuenta candidata, se prefiere la más vieja (`createdAt` más antiguo) — la más probable de ser la cuenta
real original.

Este orden — exacto primero, insensible como fallback — es estrictamente más seguro que lo que había antes
de HOY (el bug de la sección 7 nunca hubiera existido con este orden desde el principio) y no requiere
ningún cambio de datos ni migración: es puramente un cambio en el ORDEN en que se prueban las búsquedas.

**Tests:** se agregaron 3 casos que reproducen el incidente real con dos cuentas de casing distinto —
logueándose con el casing exacto de CADA una de las dos, siempre entra con la cuenta correcta (nunca con la
otra) — más un tercer test para el caso residual (un casing que no matchea ninguna de las dos exacto, cae al
fallback y trae la más vieja, de forma determinística).

264 backend en verde (no se tocó nada de frontend en este hotfix).

---
