const User = require('../models/User');
const Plan = require('../models/Plan');
const transporter = require('../config/mailer');

const createStudent = async (req, res) => {
    const { nombre, dni, email, peso, altura, domicilio } = req.body;

    try {
        const userExists = await User.findOne({ $or: [{ email }, { dni }] });
        if (userExists) {
            return res.status(400).json({ message: 'El correo o DNI ya están registrados en el sistema.' });
        }

        const student = await User.create({
            nombre,
            email,
            dni,
            password: dni,
            peso,
            altura,
            domicilio,
            role: 'user',
            estado: 'Al día',
            adminId: req.user._id,
            fechaVencimiento: new Date(new Date().setMonth(new Date().getMonth() + 1))
        });
        try {
            await transporter.sendMail({
                from: `"FFIT+ Entrenamientos" <${process.env.EMAIL_USER}>`,
                to: student.email,
                subject: '¡Bienvenido a FFIT+! Tu cuenta ha sido creada 🚀',
                html: `
                    <h2>¡Hola ${student.nombre}!</h2>
                    <p>Bienvenido a nuestra plataforma de entrenamiento de alto rendimiento.</p>
                    <p>Tu cuenta ya está activa. Puedes ingresar a la app con estos datos:</p>
                    <ul>
                        <li><strong>Email:</strong> ${student.email}</li>
                        <li><strong>Contraseña:</strong> ${student.dni}</li>
                    </ul>
                    <p>¡Prepárate para llevar tu físico al siguiente nivel!</p>
                `
            });
        } catch (error) {
            console.error("Error enviando email de bienvenida:", error);
        }

        res.status(201).json({
            _id: student._id,
            nombre: student.nombre,
            email: student.email,
            dni: student.dni,
            message: 'Alumno creado con éxito'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al registrar alumno', error: error.message });
    }
};


const getStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'user', adminId: req.user._id })
            .select('-password')
            .lean()
            .sort({ createdAt: -1 });

        for (let student of students) {
            const planActivo = await Plan.findOne({ alumnoId: student._id, esPlantilla: false })
                .sort({ createdAt: -1 });

            student.planActivoNombre = planActivo ? planActivo.titulo : 'Sin rutina asignada';
        }

        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alumnos' });
    }
};

const renewSubscription = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, adminId: req.user._id });
        if (!user) return res.status(404).json({ message: 'Alumno no encontrado o no autorizado' });

        const hoy = new Date();
        const vencimientoActual = new Date(user.fechaVencimiento);

        const baseDate = vencimientoActual > hoy ? vencimientoActual : hoy;

        user.fechaVencimiento = new Date(baseDate.setDate(baseDate.getDate() + 30));
        user.estado = 'Al día';

        await user.save();
        res.json({ message: 'Membresía renovada por 30 días exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al renovar membresía' });
    }
};

const deleteStudent = async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, adminId: req.user._id });
        if (!user) return res.status(404).json({ message: 'Alumno no encontrado o no autorizado' });

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Alumno eliminado del sistema' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar alumno' });
    }
};
module.exports = { createStudent, getStudents, renewSubscription, deleteStudent };