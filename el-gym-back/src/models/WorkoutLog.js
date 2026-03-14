const mongoose = require('mongoose');

const exerciseLogSchema = new mongoose.Schema({
    ejercicioId: { type: String, required: true },
    nombre: { type: String, required: true },
    pesoUsado: { type: Number, default: 0 }
});

const workoutLogSchema = new mongoose.Schema({
    alumnoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    nombreSesion: { type: String, required: true },
    duracion: { type: String, default: '45m' },
    ejercicios: [exerciseLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);