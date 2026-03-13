const mongoose = require('mongoose');

// Sub-esquema: Aquí guardamos el peso exacto de CADA ejercicio
const exerciseLogSchema = new mongoose.Schema({
    ejercicioId: { type: String, required: true }, // El ID original del ejercicio
    nombre: { type: String, required: true },      // Ej: "Press de Banca"
    pesoUsado: { type: Number, default: 0 }        // Ej: 70
});

// ESQUEMA PRINCIPAL
const workoutLogSchema = new mongoose.Schema({
    alumnoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    nombreSesion: { type: String, required: true }, // Ej: "Día 1: Pecho"
    duracion: { type: String, default: '45m' },     
    ejercicios: [exerciseLogSchema]                 // La lista de pesos de ese día
}, { timestamps: true });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);