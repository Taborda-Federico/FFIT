const mongoose = require('mongoose');

// 1. Molde del Ejercicio
const ejercicioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    series: { type: Number },           // Usado en standard/superset
    reps: { type: String },             // String para rangos ej: "10-12" o "Fallo"
    tiempo: { type: String },           // Usado en circuitos ej: "45"
    pesoAnterior: { type: String },
    videoUrl: { type: String },
    notas: { type: String }
});

// 2. Molde del Bloque (Serie, Superserie, Circuito)
const bloqueSchema = new mongoose.Schema({
    tipo: { 
        type: String, 
        enum: ['standard', 'superset', 'circuit'], 
        required: true 
    },
    descanso: { type: Number, default: 60 }, // En segundos
    vueltas: { type: Number, default: 1 },   // Cuántas veces se repite el bloque
    ejercicios: [ejercicioSchema]
});

// 3. Molde del Día (Sesión)
const sesionSchema = new mongoose.Schema({
    orden: { type: Number }, // Día 1, Día 2...
    nombre: { type: String, required: true },
    bloques: [bloqueSchema]
});

// 4. ESQUEMA PRINCIPAL DEL PLAN
const planSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    notasGlobales: { type: String },
    vencimiento: { type: Date },
    
    // ¿A quién pertenece? (Si está vacío, es una Plantilla genérica)
    alumnoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    
    // ¿Qué Admin lo creó?
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // Interruptor mágico: Diferencia entre Plan Asignado y Plantilla
    esPlantilla: { type: Boolean, default: false },
    
    sesiones: [sesionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);