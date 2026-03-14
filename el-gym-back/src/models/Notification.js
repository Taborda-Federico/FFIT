const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    alumnoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    titulo: {
        type: String,
        required: true
    },
    mensaje: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        enum: ['INFO', 'PLAN', 'ALERTA', 'PAGO'],
        default: 'INFO'
    },
    leida: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);