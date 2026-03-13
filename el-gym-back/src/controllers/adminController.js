const WorkoutLog = require('../models/WorkoutLog');
const AdminNote = require('../models/AdminNote');
const User = require('../models/User');

// @desc    Obtener todo el historial y notas de un alumno específico
// @route   GET /api/admin/student-progress/:alumnoId
const getStudentProgress = async (req, res) => {
    try {
        const { alumnoId } = req.params;

        // 1. Buscamos los entrenamientos del alumno (pesos reales)
        const historial = await WorkoutLog.find({ alumnoId }).sort({ createdAt: -1 });

        // 2. Buscamos las notas que tú (u otros admins) le hayan dejado
        const notas = await AdminNote.find({ alumnoId }).sort({ createdAt: -1 });

        res.json({
            historial,
            notas
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el seguimiento del alumno' });
    }
};

// @desc    Crear una nueva nota de evolución para un alumno
// @route   POST /api/admin/student-notes
const createAdminNote = async (req, res) => {
    try {
        const { alumnoId, contenido } = req.body;

        const nuevaNota = await AdminNote.create({
            alumnoId,
            adminId: req.user._id, // Tomamos tu ID del token
            contenido
        });

        res.status(201).json(nuevaNota);
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar la nota' });
    }
};

module.exports = { getStudentProgress, createAdminNote };