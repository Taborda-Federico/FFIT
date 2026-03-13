const mongoose = require('mongoose');

const adminNoteSchema = new mongoose.Schema({
    alumnoId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    contenido: { 
        type: String, 
        required: true 
    },
    fecha: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model('AdminNote', adminNoteSchema);