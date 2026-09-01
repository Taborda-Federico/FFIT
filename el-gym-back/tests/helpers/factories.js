// tests/helpers/factories.js
//
// Funciones para crear datos de prueba rápido: un admin, un alumno, un plan,
// y el token JWT correspondiente. `makeToken` reimplementa la firma que hace
// authController.generateToken (no está exportada) — es una única línea de
// jsonwebtoken, bajo riesgo de que se desincronice.
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Plan = require('../../src/models/Plan');

function makeToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

let counter = 0;
function unique(prefix) {
    counter += 1;
    return `${prefix}${Date.now()}${counter}`;
}

async function createAdmin(overrides = {}) {
    const admin = await User.create({
        nombre: overrides.nombre || 'Profe de Prueba',
        email: overrides.email || `${unique('admin')}@ffit.test`,
        password: overrides.password || 'password123',
        role: 'admin',
        ...overrides
    });
    const token = makeToken(admin._id);
    return { admin, token };
}

async function createStudentDirect(adminId, overrides = {}) {
    // Crea el alumno pegándole directo al modelo (no vía HTTP), útil cuando
    // el test no está probando el endpoint de creación en sí mismo.
    const dni = overrides.dni || unique('dni');
    const student = await User.create({
        nombre: overrides.nombre || 'Alumno de Prueba',
        email: overrides.email || `${unique('alumno')}@ffit.test`,
        dni,
        password: overrides.password || dni,
        telefono: overrides.telefono,
        role: 'user',
        estado: overrides.estado || 'Al día',
        adminId,
        fechaVencimiento: overrides.fechaVencimiento || new Date(new Date().setMonth(new Date().getMonth() + 1)),
        peso: overrides.peso,
        altura: overrides.altura
    });
    const token = makeToken(student._id);
    return { student, token };
}

function buildSesion(overrides = {}) {
    return {
        nombre: overrides.nombre || 'Día 1',
        orden: overrides.orden,
        bloques: overrides.bloques || [
            {
                tipo: 'standard',
                descanso: 60,
                vueltas: 1,
                ejercicios: [
                    { nombre: 'Press banca', series: 4, reps: '8-10', pesoAnterior: '40' }
                ]
            }
        ]
    };
}

async function createPlanDirect(adminId, alumnoId, overrides = {}) {
    const plan = await Plan.create({
        titulo: overrides.titulo || 'Plan de Prueba',
        notasGlobales: overrides.notasGlobales,
        vencimiento: overrides.vencimiento !== undefined ? overrides.vencimiento : 4,
        alumnoId: alumnoId || null,
        adminId,
        esPlantilla: overrides.esPlantilla || false,
        activo: overrides.activo !== undefined ? overrides.activo : true,
        avisoVencimientoEnviado: overrides.avisoVencimientoEnviado || false,
        sesiones: overrides.sesiones || [buildSesion()],
        createdAt: overrides.createdAt
    });
    // Si se pidió una createdAt específica (para simular planes "viejos"),
    // Mongoose con timestamps:true la pisa al crear; la seteamos aparte.
    if (overrides.createdAt) {
        plan.createdAt = overrides.createdAt;
        await plan.save();
    }
    return plan;
}

module.exports = {
    makeToken,
    unique,
    createAdmin,
    createStudentDirect,
    createPlanDirect,
    buildSesion
};
