// tests/setup/silenceConsole.js
//
// La app hace console.log/console.error a propósito (logs del cron, errores
// atrapados en los try/catch de los controllers). Eso es un ruido enorme
// corriendo cientos de tests — muchos tests EXISTEN justamente para
// disparar esas ramas de error. Los silenciamos acá; si un test necesita
// verificar qué se logueó, puede espiarlos igual (jest.spyOn sigue
// funcionando sobre un mock).
beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
});
