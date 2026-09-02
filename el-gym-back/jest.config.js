// jest.config.js
//
// Config de Jest para el backend. Corre en Node (no jsdom, esto es una API).
// Usamos mongodb-memory-server (ver tests/helpers/db.js) así ningún test
// toca la base de datos real de producción.
module.exports = {
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/tests/setup/env.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup/silenceConsole.js'],
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 30000,
    verbose: true,
    clearMocks: true,
    // El binario de mongod real que mongodb-memory-server debe reusar
    // (ver MONGOMS_SYSTEM_BINARY en package.json) evita que cada corrida
    // intente descargar un binario de Mongo desde internet.
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js'
    ]
};
