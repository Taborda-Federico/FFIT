const mongoose = require('mongoose');

// Sub-esquema para las Clases
const claseSchema = new mongoose.Schema({
    id: { type: Number }, // Usamos el ID de React para mantener el orden
    title: { type: String, required: true },
    iconName: { type: String, default: 'FaDumbbell' },
    image: { type: String },
    description: { type: String }
});

// Sub-esquema para el Staff (Coaches)
const coachSchema = new mongoose.Schema({
    id: { type: Number },
    name: { type: String, required: true },
    role: { type: String },
    image: { type: String },
    instagram: { type: String },
    specialty: [{ type: String }],
    bio: { type: String }
});
const heroBgSchema = new mongoose.Schema({
    id: { type: Number },
    url: { type: String, required: true }
});
// ESQUEMA PRINCIPAL
const landingSchema = new mongoose.Schema({
    // Etiqueta para saber de qué gimnasio/admin es esta página
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    clases: [claseSchema],
    coaches: [coachSchema]
}, { timestamps: true });





module.exports = mongoose.model('Landing', landingSchema);

