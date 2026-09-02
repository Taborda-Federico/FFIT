// tests/helpers/db.js
//
// Cada archivo de test levanta su propia instancia de mongodb-memory-server
// (usando el mongod real del sistema — ver MONGOMS_SYSTEM_BINARY en
// package.json — así no descarga nada ni toca Mongo real). Se elige "una
// instancia por archivo" en vez de una global compartida porque es más
// simple y evita bugs de estado compartido entre archivos que corren en
// procesos/sandboxes separados de Jest.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function connect() {
    // version explícita = la del mongod real del sistema (ver package.json,
    // MONGOMS_SYSTEM_BINARY): evita el warning de "posible conflicto de
    // versión" en cada corrida, sin cambiar qué binario termina usando.
    mongod = await MongoMemoryServer.create({ binary: { version: '7.0.25' } });
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
