const Plan = require('../models/Plan');
const User = require('../models/User');
const Notification = require('../models/Notification');
const transporter = require('../config/mailer');

const publicarPlan = async (req, res) => {
    try {
        const { alumnoId, titulo, notasGlobales, vencimiento, sesiones } = req.body;

        const alumno = await User.findOne({ _id: alumnoId, adminId: req.user._id });
        if (!alumno) {
            return res.status(403).json({ message: 'Alumno no encontrado o no autorizado en tu panel.' });
        }

        await Plan.updateMany(
            { alumnoId: alumno._id, esPlantilla: false },
            { $set: { activo: false } }
        );

        const nuevoPlan = await Plan.create({
            titulo,
            notasGlobales,
            vencimiento,
            alumnoId: alumno._id,
            adminId: req.user._id,
            esPlantilla: false,

            activo: true,

            sesiones
        });

        try {
            if (alumno && alumno.email) {
                await transporter.sendMail({
                    from: `"Tu Coach en FFIT+" <${process.env.EMAIL_USER}>`,
                    to: alumno.email,
                    subject: '¡Nueva Rutina Asignada! 🏋️‍♂️',
                    html: `
                        <h3>¡Hola ${alumno.nombre}!</h3>
                        <p>Tu entrenador te acaba de asignar un nuevo plan de entrenamiento:</p>
                        <h2 style="color: #d4f039; background: #111; padding: 10px; display: inline-block;">${req.body.titulo}</h2>
                        <p>Entra a la aplicación ahora mismo para ver los bloques y ejercicios de esta semana.</p>
                        <p>¡A romperla!</p>
                    `
                });
            }
        } catch (error) {
            console.error("Error al enviar email de nueva rutina:", error);
        }

        res.status(201).json({ message: '¡Plan publicado y asignado con éxito!', plan: nuevoPlan });
    } catch (error) {
        res.status(500).json({ message: 'Error al publicar el plan', error: error.message });
    }
};

const guardarPlantilla = async (req, res) => {
    try {
        const { titulo, notasGlobales, sesiones } = req.body;

        const nuevaPlantilla = await Plan.create({
            titulo,
            notasGlobales,
            adminId: req.user._id,
            esPlantilla: true,
            sesiones
        });

        res.status(201).json({ message: 'Plantilla guardada para futuros usos', plantilla: nuevaPlantilla });
    } catch (error) {
        res.status(500).json({ message: 'Error al guardar la plantilla', error: error.message });
    }
};

const getPlantillas = async (req, res) => {
    try {
        // IDOR FIX: Solo obtener plantillas que pertenecen a este admin
        const plantillas = await Plan.find({ esPlantilla: true, adminId: req.user._id }).sort({ createdAt: -1 });
        res.json(plantillas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las plantillas' });
    }
};

// Actualiza una plantilla EXISTENTE (a diferencia de guardarPlantilla, que
// siempre crea una nueva). Se agrega para el modal de "Gestionar
// Plantillas": antes, la única forma de "editar" una plantilla era
// cargarla en el armador y guardarla de nuevo, lo que en realidad creaba
// una copia — nunca se pisaba la original. Con el tiempo eso es exactamente
// lo que le llenó la lista de plantillas casi-duplicadas al cliente.
const actualizarPlantilla = async (req, res) => {
    try {
        const { titulo, notasGlobales, sesiones } = req.body;

        // Mismo patrón de scoping que deleteStudent/publicarPlan: se busca
        // por _id Y adminId a la vez (no primero por _id y comprobando
        // después) para que un admin no pueda ni enterarse de que existe
        // una plantilla ajena con ese id, y muchísimo menos pisarla.
        const plantilla = await Plan.findOne({ _id: req.params.id, adminId: req.user._id, esPlantilla: true });
        if (!plantilla) {
            return res.status(404).json({ message: 'Plantilla no encontrada o no autorizada' });
        }

        plantilla.titulo = titulo;
        plantilla.notasGlobales = notasGlobales;
        plantilla.sesiones = sesiones;
        await plantilla.save();

        res.json({ message: 'Plantilla actualizada con éxito', plantilla });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la plantilla', error: error.message });
    }
};

const eliminarPlantilla = async (req, res) => {
    try {
        const plantilla = await Plan.findOne({ _id: req.params.id, adminId: req.user._id, esPlantilla: true });
        if (!plantilla) {
            return res.status(404).json({ message: 'Plantilla no encontrada o no autorizada' });
        }

        await Plan.findByIdAndDelete(req.params.id);
        res.json({ message: 'Plantilla eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la plantilla' });
    }
};

module.exports = { publicarPlan, guardarPlantilla, getPlantillas, actualizarPlantilla, eliminarPlantilla };