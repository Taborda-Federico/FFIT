const User = require('../models/User');
const Plan = require('../models/Plan');
const Notification = require('../models/Notification');
const WorkoutLog = require('../models/WorkoutLog');

const getStudentDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const hoy = new Date();
        const vencimientoCuota = new Date(user.fechaVencimiento);
        const diasRestantes = Math.ceil((vencimientoCuota - hoy) / (1000 * 60 * 60 * 24));


        const planActivo = await Plan.findOne({
            alumnoId: user._id,
            esPlantilla: false,
            activo: true
        }).sort({ createdAt: -1 }); const totalWorkouts = await WorkoutLog.countDocuments({ alumnoId: user._id });

        res.json({
            user: {
                nombre: user.nombre,
                email: user.email,
                dni: user.dni,
                peso: user.peso,
                altura: user.altura,
                fechaIngreso: user.createdAt,
                fechaVencimiento: user.fechaVencimiento,
                diasRestantes: diasRestantes > 0 ? diasRestantes : 0,
                estado: diasRestantes > 0 ? 'ACTIVO' : 'VENCIDO'
            },
            stats: { sesionesCompletadas: totalWorkouts, racha: 12 },

            plan: planActivo ? {
                _id: planActivo._id,
                titulo: planActivo.titulo,
                semanasRestantes: planActivo.vencimiento,
                sesiones: planActivo.sesiones,
                createdAt: planActivo.createdAt
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar el dashboard' });
    }
};

//
const saveWorkoutLog = async (req, res) => {
    try {
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);

        const hoyFin = new Date();
        hoyFin.setHours(23, 59, 59, 999);

        const yaEntrenoHoy = await WorkoutLog.findOne({
            alumnoId: req.user._id,
            createdAt: { $gte: hoyInicio, $lte: hoyFin }
        });


        if (yaEntrenoHoy) {
            return res.status(400).json({
                message: '¡Ey! Ya registraste un entrenamiento hoy. No hagas trampa. 😉'
            });
        }

        const { nombreSesion, duracion, ejercicios } = req.body;

        const newLog = await WorkoutLog.create({
            alumnoId: req.user._id,
            nombreSesion,
            duracion,
            ejercicios: ejercicios
        });

        res.status(201).json({ message: 'Entrenamiento guardado', log: newLog });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar el entrenamiento', error: error.message });
    }
};

const getMyHistory = async (req, res) => {
    try {
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

const getMyNotifications = async (req, res) => {
    try {
        const notificaciones = await Notification.find({ alumnoId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notificaciones);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar notificaciones' });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { leida: true });
        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar notificación' });
    }
};
module.exports = { getStudentDashboard, saveWorkoutLog, getMyHistory, getMyNotifications, markNotificationRead };