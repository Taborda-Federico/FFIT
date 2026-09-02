// tests/helpers/db.js
//
// Cada archivo de test levanta su propia instancia de mongodb-memory-server
// (nunca toca Mongo real). Se elige "una instancia por archivo" en vez de
// una global compartida porque es más simple y evita bugs de estado
// compartido entre archivos que corren en procesos/sandboxes separados de
// Jest.
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function connect() {
    // Si hay un mongod instalado en el sistema (como en esta máquina de
    // desarrollo), lo reusamos para no descargar nada. Si no existe (por
    // ejemplo en un runner de CI limpio), mongodb-memory-server descarga su
    // propio binario automáticamente — por eso esto NUNCA se hardcodea en
    // package.json, tiene que funcionar en cualquier máquina sin setup previo.
    const systemMongod = process.env.MONGOMS_SYSTEM_BINARY || '/usr/bin/mongod';
    const opts = fs.existsSync(systemMongod)
        ? { binary: { systemBinary: systemMongod } }
        : {};
    mongod = await MongoMemoryServer.create(opts);
    const uri = mongod.getUri();
    await mongoose.connect(uri);
}

async function closeDatabase() {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) await mongod.stop();
}

async function clearDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
}

module.exports = { connect, closeDatabase, clearDatabase };
