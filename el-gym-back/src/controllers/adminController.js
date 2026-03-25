const WorkoutLog = require('../models/WorkoutLog');
const AdminNote = require('../models/AdminNote');
const User = require('../models/User');

const getStudentProgress = async (req, res) => {
    try {
        const { alumnoId } = req.params;

        // VERIFICACIÓN DE SEGURIDAD (IDOR)
        const alumno = await User.findOne({ _id: alumnoId, adminId: req.user._id });
        if (!alumno) {
            return res.status(403).json({ message: 'No tienes permisos para ver el progreso de este alumno' });
        }

        const historial = await WorkoutLog.find({ alumnoId }).sort({ createdAt: -1 }).limit(50);
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

        // VERIFICACIÓN DE SEGURIDAD (IDOR)
        const alumno = await User.findOne({ _id: alumnoId, adminId: req.user._id });
        if (!alumno) {
            return res.status(403).json({ message: 'No tienes permisos para agregar notas a este alumno' });
        }

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