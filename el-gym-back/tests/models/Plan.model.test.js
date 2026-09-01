const mongoose = require('mongoose');
const Plan = require('../../src/models/Plan');
const { connect, closeDatabase, clearDatabase } = require('../helpers/db');
const { createAdmin, createStudentDirect, buildSesion } = require('../helpers/factories');

beforeAll(async () => { await connect(); }, 60000);
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe('Modelo Plan', () => {
    let admin;
    beforeEach(async () => { ({ admin } = await createAdmin()); });

    describe('campos requeridos y defaults', () => {
        it('rechaza un plan sin título', async () => {
            await expect(Plan.create({ adminId: admin._id, sesiones: [] })).rejects.toThrow();
        });

        it('rechaza un plan sin adminId', async () => {
            await expect(Plan.create({ titulo: 'X', sesiones: [] })).rejects.toThrow();
        });

        it('un título vacío ("") es rechazado (required en Mongoose 8 valida string vacío)', async () => {
            await expect(Plan.create({ titulo: '', adminId: admin._id, sesiones: [] })).rejects.toThrow();
        });

        it('vencimiento por defecto es 4 (semanas)', async () => {
            const plan = await Plan.create({ titulo: 'X', adminId: admin._id, sesiones: [] });
            expect(plan.vencimiento).toBe(4);
        });

        it('activo por defecto es true', async () => {
            const plan = await Plan.create({ titulo: 'X', adminId: admin._id, sesiones: [] });
            expect(plan.activo).toBe(true);
        });

        it('esPlantilla por defecto es false', async () => {
            const plan = await Plan.create({ titulo: 'X', adminId: admin._id, sesiones: [] });
            expect(plan.esPlantilla).toBe(false);
        });

        it('avisoVencimientoEnviado por defecto es false', async () => {
            const plan = await Plan.create({ titulo: 'X', adminId: admin._id, sesiones: [] });
            expect(plan.avisoVencimientoEnviado).toBe(false);
        });

        it('alumnoId por defecto es null (permite plantillas sin alumno asignado)', async () => {
            const plan = await Plan.create({ titulo: 'X', adminId: admin._id, sesiones: [] });
            expect(plan.alumnoId).toBeNull();
        });

        it('tiene timestamps automáticos', async () => {
            const plan = await Plan.create({ titulo: 'X', adminId: admin._id, sesiones: [] });
            expect(plan.createdAt).toBeInstanceOf(Date);
        });
    });

    describe('el schema de Plan NO tiene ningún campo de día de la semana', () => {
        it('una sesión con un campo "dia" arbitrario lo descarta silenciosamente (no está en el schema)', async () => {
            const plan = await Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'Día 1', dia: 'Lunes', bloques: [] }]
            });
            expect(plan.sesiones[0].dia).toBeUndefined();
            const raw = await Plan.collection.findOne({ _id: plan._id });
            expect(raw.sesiones[0].dia).toBeUndefined();
        });

        it('el único campo de "orden" temporal es `orden` (Number libre), no está atado a un día calendario', async () => {
            const plan = await Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'Día 1', orden: 1, bloques: [] }, { nombre: 'Día 2', orden: 2, bloques: [] }]
            });
            expect(plan.sesiones[0].orden).toBe(1);
            // orden es un Number libre, no un enum de días ni se valida contra
            // un calendario: nada impide dos sesiones con el mismo orden.
            const dup = await Plan.create({
                titulo: 'Y', adminId: admin._id,
                sesiones: [{ nombre: 'A', orden: 1, bloques: [] }, { nombre: 'B', orden: 1, bloques: [] }]
            });
            expect(dup.sesiones[0].orden).toBe(dup.sesiones[1].orden);
        });
    });

    describe('nombres de sesión duplicados dentro del mismo plan', () => {
        it('el schema permite dos sesiones con el mismo nombre en el mismo plan (sin validación de unicidad)', async () => {
            const plan = await Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [buildSesion({ nombre: 'Día 3' }), buildSesion({ nombre: 'Día 3' })]
            });
            expect(plan.sesiones).toHaveLength(2);
            expect(plan.sesiones[0].nombre).toBe(plan.sesiones[1].nombre);
            // Esto es exactamente lo que puede pasar en AdminDashboard.jsx: al
            // borrar una sesión intermedia y agregar una nueva, el nombre
            // autogenerado "Día N" puede repetir uno ya existente. El frontend
            // (HomeHub.isSessionCompleted) matchea por nombre, así que dos
            // sesiones con igual nombre son indistinguibles para el alumno.
        });
    });

    describe('bloques: enum de tipo y defaults', () => {
        it('acepta tipo "standard", "superset" y "circuit"', async () => {
            for (const tipo of ['standard', 'superset', 'circuit']) {
                const plan = await Plan.create({
                    titulo: `Plan ${tipo}`, adminId: admin._id,
                    sesiones: [{ nombre: 'S', bloques: [{ tipo, ejercicios: [{ nombre: 'Ej' }] }] }]
                });
                expect(plan.sesiones[0].bloques[0].tipo).toBe(tipo);
            }
        });

        it('rechaza un tipo de bloque fuera del enum', async () => {
            await expect(Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'S', bloques: [{ tipo: 'hiit-random', ejercicios: [{ nombre: 'Ej' }] }] }]
            })).rejects.toThrow();
        });

        it('descanso por defecto es 60 (segundos)', async () => {
            const plan = await Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'S', bloques: [{ tipo: 'standard', ejercicios: [{ nombre: 'Ej' }] }] }]
            });
            expect(plan.sesiones[0].bloques[0].descanso).toBe(60);
        });

        it('vueltas por defecto es 1', async () => {
            const plan = await Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'S', bloques: [{ tipo: 'circuit', ejercicios: [{ nombre: 'Ej' }] }] }]
            });
            expect(plan.sesiones[0].bloques[0].vueltas).toBe(1);
        });
    });

    describe('ejercicios: campos requeridos', () => {
        it('rechaza un ejercicio sin nombre', async () => {
            await expect(Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'S', bloques: [{ tipo: 'standard', ejercicios: [{ series: 4 }] }] }]
            })).rejects.toThrow();
        });

        it('rechaza un ejercicio con nombre vacío ("")', async () => {
            await expect(Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{ nombre: 'S', bloques: [{ tipo: 'standard', ejercicios: [{ nombre: '' }] }] }]
            })).rejects.toThrow();
        });

        it('acepta un ejercicio con todos los campos opcionales', async () => {
            const plan = await Plan.create({
                titulo: 'X', adminId: admin._id,
                sesiones: [{
                    nombre: 'S', bloques: [{
                        tipo: 'standard',
                        ejercicios: [{ nombre: 'Sentadilla', series: 4, reps: '8-10', tiempo: '', pesoAnterior: '60', video: 'https://x.com', notas: 'bajar controlado' }]
                    }]
                }]
            });
            expect(plan.sesiones[0].bloques[0].ejercicios[0].notas).toBe('bajar controlado');
        });
    });

    describe('reutilización de plantilla: colisión de _id de subdocumentos entre planes distintos', () => {
        it('publicar el MISMO objeto de sesión (con _id explícito) a dos alumnos distintos produce el mismo _id de subdocumento en ambos planes', async () => {
            // Esto reproduce lo que hace handleCargarPlantilla en el frontend:
            // cuando se carga una plantilla, sus sesiones (con _id reales de Mongo)
            // se copian tal cual al nuevo plan. Si esas mismas sesiones (mismo _id)
            // se publican para DOS alumnos distintos, ambos planes terminan con
            // subdocumentos que comparten _id. No corrompe datos (cada Plan es un
            // documento independiente) pero es una sorpresa para cualquier query
            // futura que asuma que 'sesiones._id' es único globalmente.
            const plantilla = await Plan.create({
                titulo: 'Plantilla', adminId: admin._id, esPlantilla: true,
                sesiones: [buildSesion({ nombre: 'Día 1' })]
            });
            const sesionParaReusar = plantilla.sesiones[0].toObject();

            const { student: alumno1 } = await createStudentDirect(admin._id, {});
            const { student: alumno2 } = await createStudentDirect(admin._id, {});

            const plan1 = await Plan.create({ titulo: 'P1', adminId: admin._id, alumnoId: alumno1._id, sesiones: [sesionParaReusar] });
            const plan2 = await Plan.create({ titulo: 'P2', adminId: admin._id, alumnoId: alumno2._id, sesiones: [sesionParaReusar] });

            expect(plan1.sesiones[0]._id.toString()).toBe(plan2.sesiones[0]._id.toString());
            expect(plan1.sesiones[0]._id.toString()).toBe(sesionParaReusar._id.toString());
        });

        it('en cambio, si NO se pasa _id explícito, cada plan genera subdocumentos con _id distinto (comportamiento sano)', async () => {
            const { student: alumno1 } = await createStudentDirect(admin._id, {});
            const { student: alumno2 } = await createStudentDirect(admin._id, {});
            const plan1 = await Plan.create({ titulo: 'P1', adminId: admin._id, alumnoId: alumno1._id, sesiones: [buildSesion()] });
            const plan2 = await Plan.create({ titulo: 'P2', adminId: admin._id, alumnoId: alumno2._id, sesiones: [buildSesion()] });
            expect(plan1.sesiones[0]._id.toString()).not.toBe(plan2.sesiones[0]._id.toString());
        });
    });
});
