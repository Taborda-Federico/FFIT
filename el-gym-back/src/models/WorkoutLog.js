const mongoose = require('mongoose');

// Una serie puntual dentro de un ejercicio: el peso real que se usó en ESA
// serie y, si se cargó, las repeticiones hechas. `numero` es simplemente
// 1, 2, 3... en el orden en que se completaron esa sesión — no tiene que
// coincidir con la cantidad de series de ningún otro día ni con lo que
// pide el plan (ver docs/CAMBIOS.md).
const setLogSchema = new mongoose.Schema({
    numero: { type: Number, required: true },
    peso: { type: Number, default: 0 },
    reps: { type: Number }
}, { _id: false });

const exerciseLogSchema = new mongoose.Schema({
    ejercicioId: { type: String, required: true },
    nombre: { type: String, required: true },
    // pesoUsado se sigue guardando SIEMPRE — ya no lo manda el frontend
    // directo, lo calcula el propio backend como el máximo de `series`
    // (ver studentController.saveWorkoutLog). Se mantiene por dos motivos:
    // 1) los WorkoutLog ya guardados en la base (meses de historial) solo
    //    tienen este campo, nunca `series` — nada que migrar.
    // 2) cualquier pantalla que todavía no sepa de `series` (o un log
    //    viejo sin series) sigue funcionando exactamente igual que antes,
    //    sin ningún cambio de código necesario en esos casos.
    pesoUsado: { type: Number, default: 0 },
    // NUEVO, opcional: el desglose real serie por serie. Si no viene (logs
    // viejos, o un cliente que todavía no manda este campo), queda como
    // array vacío — el resto de la app cae automáticamente al
    // comportamiento de siempre usando `pesoUsado`.
    series: [setLogSchema]
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