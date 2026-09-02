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


        // "Semanas restantes" del plan: se lee directo de plan.vencimiento,
        // el contador que mantiene el cron semanal (ver cron/expirationCheck.js).
        // Antes, ACÁ TAMBIÉN se recalculaba una fecha de expiración propia a
        // partir de createdAt + vencimiento*7 días — pero como esa cuenta
        // usaba el vencimiento YA decrementado por el cron como si fuera el
        // total original, el plan perdía casi el doble de semanas de vida
        // por cada semana real que pasaba (ver docs/CAMBIOS.md #5). Con un
        // solo lugar (el cron) escribiendo `vencimiento` y `activo`, esta
        // ruta pasa a ser una simple LECTURA: un GET ya no modifica nada de
        // la base (evita además la condición de carrera de antes, donde dos
        // pedidos simultáneos podían duplicar la notificación de "por vencer").
        const planActivo = await Plan.findOne({
            alumnoId: user._id,
            esPlantilla: false,
            activo: true
        }).sort({ createdAt: -1 });
        const totalWorkouts = await WorkoutLog.countDocuments({ alumnoId: user._id });

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
            stats: { sesionesCompletadas: totalWorkouts, racha: 0 },

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
        const history = await WorkoutLog.find({ alumnoId: req.user._id }).sort({ createdAt: -1 }).limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error al cargar el historial' });
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
        // Antes esto actualizaba por id sin chequear el dueño: cualquier
        // alumno logueado podía marcar como leída la notificación de OTRO
        // alumno con solo adivinar/probar su id (IDOR). Se filtra también
        // por alumnoId para que solo se pueda tocar la propia.
        const notificacion = await Notification.findOneAndUpdate(
            { _id: req.params.id, alumnoId: req.user._id },
            { leida: true },
            { new: true }
        );
        if (!notificacion) {
            return res.status(404).json({ message: 'Notificación no encontrada' });
        }
        res.json({ message: 'Notificación marcada como leída' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar notificación' });
    }
};

const changePassword = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const { currentPassword, newPassword } = req.body;
        
        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cambiar la contraseña' });
    }
};

module.exports = { getStudentDashboard, saveWorkoutLog, getMyHistory, getMyNotifications, markNotificationRead, changePassword };