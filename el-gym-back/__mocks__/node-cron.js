// __mocks__/node-cron.js
//
// Mock global de node-cron. Sin esto, con solo hacer `require()` de
// src/cron/expirationCheck.js ya se registrarían DOS cronjobs reales
// (setInterval de fondo) que quedarían corriendo durante toda la suite
// de tests y podrían disparar en medio de una corrida larga.
//
// En vez de programar un timer real, guardamos cada callback registrado
// para que los tests del cron lo disparen a mano (ver tests/cron/*.test.js)
// y así se ejecuta la lógica REAL del archivo, no una reimplementación.
const registered = [];

function schedule(expression, callback, options) {
    registered.push({ expression, callback, options });
    return { start: jest.fn(), stop: jest.fn(), now: jest.fn() };
}

module.exports = {
    schedule,
    __getRegistered: () => registered,
    __resetCronMock: () => { registered.length = 0; }
};
