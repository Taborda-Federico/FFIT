// tests/e2eServer.js
//
// Servidor de backend real (Express + Mongo en memoria) para los tests e2e
// de Playwright del frontend (el-gym-front/tests-e2e). Playwright lo levanta
// como uno de sus `webServer` en playwright.config.js.
//
// Por qué existe un archivo aparte de server.js: server.js se conecta a
// Mongo de PRODUCCIÓN (via MONGO_URI) y no tiene forma de resetear datos
// entre corridas de tests. Acá usamos mongodb-memory-server (igual que en
// tests/helpers/db.js) y agregamos una ruta SOLO-TEST para limpiar la base
// entre specs de Playwright, sin reiniciar el proceso.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-jwt-secret';
process.env.ADMIN_REGISTRATION_SECRET = process.env.ADMIN_REGISTRATION_SECRET || 'e2e-admin-secret';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'e2e@ffit.test';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'e2e-pass';

// Nodemailer real, pero interceptado: en el server e2e no usamos el mock de
// Jest (esto corre como proceso Node normal, no bajo Jest), así que
// reemplazamos manualmente el transporter después de requerir app.js para
// no mandar emails reales durante los tests de Playwright.
const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
    if (request === 'nodemailer') {
        return {
            createTransport: () => ({
                sendMail: async () => ({ messageId: 'e2e-mock' }),
                verify: (cb) => cb && cb(null, true)
            })
        };
    }
    return originalLoad.apply(this, arguments);
};

const fs = require('fs');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

const PORT = process.env.E2E_PORT || 5057;

async function main() {
    // Mismo criterio que tests/helpers/db.js: usar el mongod del sistema si
    // existe (rápido en esta máquina), o dejar que mongodb-memory-server
    // descargue el suyo si no (como en un runner de CI limpio).
    const systemMongod = process.env.MONGOMS_SYSTEM_BINARY || '/usr/bin/mongod';
    const opts = fs.existsSync(systemMongod) ? { binary: { systemBinary: systemMongod } } : {};
    const mongod = await MongoMemoryServer.create(opts);
    await mongoose.connect(mongod.getUri());

    // Ruta solo-test: limpia todas las colecciones. Se monta en runtime sobre
    // el mismo `app` que exporta src/app.js — no modifica ese archivo.
    app.post('/__test__/reset', async (req, res) => {
        const collections = mongoose.connection.collections;
        for (const key in collections) await collections[key].deleteMany({});
        res.json({ ok: true });
    });

    // Ruta solo-test: crea un WorkoutLog con un `createdAt` explícito (el
    // endpoint real /api/student/workout siempre usa la hora actual — acá
    // necesitamos simular "entrenó tal día" para reproducir en vivo, en un
    // browser real, el bug de límite de semana domingo/lunes de HomeHub).
    app.post('/__test__/seed-workout', async (req, res) => {
        const WorkoutLog = require('../src/models/WorkoutLog');
        const { alumnoId, nombreSesion, createdAt } = req.body;
        const log = await WorkoutLog.create({ alumnoId, nombreSesion, ejercicios: [] });
        await WorkoutLog.collection.updateOne({ _id: log._id }, { $set: { createdAt: new Date(createdAt) } });
        res.json({ ok: true });
    });

    app.listen(PORT, () => {
        console.log(`[e2e-backend] escuchando en http://localhost:${PORT} (Mongo en memoria)`);
    });
}

main().catch((err) => {
    console.error('[e2e-backend] no pudo arrancar:', err);
    process.exit(1);
});
