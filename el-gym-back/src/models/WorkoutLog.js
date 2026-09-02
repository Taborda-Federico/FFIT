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
    // Referencia opcional (NO required) al _id de la sesión puntual dentro
    // de plan.sesiones que se estaba entrenando. Se agrega para resolver la
    // colisión por nombre: si dos sesiones del mismo plan quedan con el
    // mismo `nombre` (nada lo impide hoy, ni en el front ni en el back —
    // ej. un admin copia una sesión y se olvida de renombrarla), completar
    // una marcaba como "hecha" a las dos, porque el matching en HomeHub
    // comparaba solo por texto. Es opcional y no-required para no romper
    // los WorkoutLog que ya existen en la base (meses de registros sin este
    // campo) — ver docs/CAMBIOS.md. Donde no está presente, se sigue
    // matcheando por nombre exactamente como antes (comportamiento viejo,
    // intacto).
    sesionId: { type: mongoose.Schema.Types.ObjectId, required: false },
    duracion: { type: String, default: '45m' },
    ejercicios: [exerciseLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);