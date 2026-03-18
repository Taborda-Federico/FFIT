const Plan = require('../models/Plan');
const User = require('../models/User');
const Notification = require('../models/Notification');
const transporter = require('../config/mailer');

const publicarPlan = async (req, res) => {
    try {
        const { alumnoId, titulo, notasGlobales, vencimiento, sesiones } = req.body;

        const alumno = await User.findById(alumnoId);
        if (!alumno) {
            return res.status(404).json({ message: 'Alumno no encontrado en la base de datos.' });
        }

        // 1. Apagamos los planes viejos del alumno

        // 1. Apagamos los planes viejos del alumno
        await Plan.updateMany(
            { alumnoId: alumno._id, esPlantilla: false },
            { $set: { activo: false } }
        );

        // 2. Creamos el plan nuevo encendido (activo: true)
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

        // 3. Enviamos el email (CON await)
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
        const plantillas = await Plan.find({ esPlantilla: true }).sort({ createdAt: -1 });
        res.json(plantillas);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las plantillas' });
    }
};

module.exports = { publicarPlan, guardarPlantilla, getPlantillas };