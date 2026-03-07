const Plan = require('../models/Plan');
const User = require('../models/User');

// @desc    Publicar un plan a un Alumno (asignación real)
// @route   POST /api/planes/publicar
// @access  Privado (Solo Admin)
const publicarPlan = async (req, res) => {
    try {
        const { alumnoId, titulo, notasGlobales, vencimiento, sesiones } = req.body;

        // 1. Validamos que el alumno exista
        const alumno = await User.findById(alumnoId);
        if (!alumno) {
            return res.status(404).json({ message: 'Alumno no encontrado en la base de datos.' });
        }

        // 2. Creamos el plan asignado
        const nuevoPlan = await Plan.create({
            titulo,
            notasGlobales,
            vencimiento,
            alumnoId: alumno._id,
            adminId: req.user._id, // Viene seguro desde el Token JWT
            esPlantilla: false,    // No es plantilla, es un plan activo
            sesiones
        });

        res.status(201).json({ message: '¡Plan publicado y asignado con éxito!', plan: nuevoPlan });
    } catch (error) {
        res.status(500).json({ message: 'Error al publicar el plan', error: error.message });
    }
};

// @desc    Guardar la estructura actual como Plantilla reutilizable
// @route   POST /api/planes/plantilla
// @access  Privado (Solo Admin)
const guardarPlantilla = async (req, res) => {
    try {
        const { titulo, notasGlobales, sesiones } = req.body;

        const nuevaPlantilla = await Plan.create({
            titulo,
            notasGlobales,
            adminId: req.user._id,
            esPlantilla: true, // ¡Interruptor activado!
            sesiones
        });

        res.status(201).json({ message: 'Plantilla guardada para futuros usos', plantilla: nuevaPlantilla });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar la plantilla', error: error.message });
    }
};

// @desc    Obtener lista de todas las plantillas creadas por el Staff
// @route   GET /api/planes/plantillas
// @access  Privado (Solo Admin)
const getPlantillas = async (req, res) => {
    try {
        // Buscamos solo los que tienen esPlantilla: true
        const plantillas = await Plan.find({ esPlantilla: true }).sort({ createdAt: -1 });
        res.json(plantillas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las plantillas' });
    }
};

module.exports = { publicarPlan, guardarPlantilla, getPlantillas };