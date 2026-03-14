const WorkoutLog = require('../models/WorkoutLog');
const AdminNote = require('../models/AdminNote');
const User = require('../models/User');

const getStudentProgress = async (req, res) => {
    try {
        const { alumnoId } = req.params;
        const historial = await WorkoutLog.find({ alumnoId }).sort({ createdAt: -1 });
        const notas = await AdminNote.find({ alumnoId }).sort({ createdAt: -1 });

        res.json({
            historial,
            notas
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el seguimiento del alumno' });
    }
};

const createAdminNote = async (req, res) => {
    try {
        const { alumnoId, contenido } = req.body;

        const nuevaNota = await AdminNote.create({
            alumnoId,
            adminId: req.user._id,
            contenido
        });

        res.status(201).json(nuevaNota);
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar la nota' });
    }
};

module.exports = { getStudentProgress, createAdminNote };