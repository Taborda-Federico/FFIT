const User = require('../models/User');
const Plan = require('../models/Plan');
const WorkoutLog = require('../models/WorkoutLog');

const getStudentDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        const hoy = new Date();
        const vencimiento = new Date(user.fechaVencimiento);
        const diasRestantes = Math.ceil((vencimiento - hoy) / (1000 * 60 * 60 * 24));

        const planActivo = await Plan.findOne({ alumnoId: user._id, esPlantilla: false }).sort({ createdAt: -1 });
        const totalWorkouts = await WorkoutLog.countDocuments({ alumnoId: user._id });

 res.json({
            user: {
                nombre: user.nombre,
                email: user.email,          // NUEVO
                dni: user.dni,              // NUEVO
                peso: user.peso,            // NUEVO
                altura: user.altura,        // NUEVO
                fechaIngreso: user.createdAt, // NUEVO
                fechaVencimiento: user.fechaVencimiento, // NUEVO
                diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
                estado: diasRestantes > 0 ? 'ACTIVO' : 'VENCIDO'
            },
            stats: { sesionesCompletadas: totalWorkouts, racha: 12 }, // Racha estática por ahora
            plan: planActivo ? { titulo: planActivo.titulo, sesiones: planActivo.sesiones } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar el dashboard' });
    }
};

// @desc    Guardar un entrenamiento finalizado (Pesos por ejercicio)
// @route   POST /api/student/workout
const saveWorkoutLog = async (req, res) => {
    try {
        const { nombreSesion, duracion, ejerciciosGrabados } = req.body;

        const newLog = await WorkoutLog.create({
            alumnoId: req.user._id,
            nombreSesion,
            duracion,
            ejercicios: ejerciciosGrabados 
        });

        res.status(201).json({ message: 'Entrenamiento guardado', log: newLog });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el entrenamiento', error: error.message });
    }
};

// @desc    Obtener historial completo (Para ver el progreso)
// @route   GET /api/student/history
const getMyHistory = async (req, res) => {
    try {
        // Buscamos todos sus entrenamientos y los ordenamos por fecha (más reciente primero)
        const history = await WorkoutLog.find({ alumnoId: req.user._id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar el historial' });
    }
};
const getStudentProgressForAdmin = async (req, res) => {
    try {
        const { alumnoId } = req.params;
        const historial = await WorkoutLog.find({ alumnoId }).sort({ createdAt: -1 });
        const notas = await AdminNote.find({ alumnoId }).sort({ createdAt: -1 });
        
        res.json({ historial, notas });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener progreso' });
    }
};

module.exports = { getStudentDashboard, saveWorkoutLog, getMyHistory };