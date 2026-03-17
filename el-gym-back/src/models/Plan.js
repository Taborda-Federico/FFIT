const mongoose = require('mongoose');

const ejercicioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    series: { type: Number },
    reps: { type: String },
    tiempo: { type: String },
    pesoAnterior: { type: String },
    videoUrl: { type: String },
    notas: { type: String }
});

const bloqueSchema = new mongoose.Schema({
    tipo: {
        type: String,
        enum: ['standard', 'superset', 'circuit'],
        required: true
    },
    descanso: { type: Number, default: 60 },
    vueltas: { type: Number, default: 1 },
    ejercicios: [ejercicioSchema]
});

const sesionSchema = new mongoose.Schema({
    orden: { type: Number },
    nombre: { type: String, required: true },
    bloques: [bloqueSchema]
});

const planSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    notasGlobales: { type: String },
    vencimiento: { type: Number, default: 4 },

    alumnoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    esPlantilla: { type: Boolean, default: false },

    sesiones: [sesionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);