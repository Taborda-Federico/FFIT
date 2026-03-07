const User = require('../models/User');
const Plan = require('../models/Plan');
// @desc    Registrar un nuevo alumno (Carga de Staff)
// @route   POST /api/users
// @access  Privado / Solo Admin
const createStudent = async (req, res) => {
    const { nombre, dni, email, peso, altura, domicilio } = req.body;

    try {
        // 1. Verificamos que no exista ya un alumno con ese email o DNI
        const userExists = await User.findOne({ $or: [{ email }, { dni }] });
        if (userExists) {
            return res.status(400).json({ message: 'El correo o DNI ya están registrados en el sistema.' });
        }

        // 2. Creamos al alumno. ¡Aquí aplicamos tu regla de negocio!
        const student = await User.create({
            nombre,
            email,
            dni,
            password: dni, // La contraseña será automáticamente su DNI
            peso,
            altura,
            domicilio,
            role: 'user', // Forzamos a que sea alumno, no admin
            estado: 'Al día',
            adminId: req.user._id,
            fechaVencimiento: new Date(new Date().setMonth(new Date().getMonth() + 1)) // Vence en 1 mes exacto
        });

        // 3. Respondemos al Frontend que todo salió bien
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
        // 1. Buscamos los alumnos usando .lean() para poder modificar el objeto antes de enviarlo
        const students = await User.find({ role: 'user', adminId: req.user._id })
            .select('-password')
            .lean() 
            .sort({ createdAt: -1 });

        // 2. Buscamos el plan activo de cada alumno
        for (let student of students) {
            // Buscamos el plan más reciente asignado a este ID
            const planActivo = await Plan.findOne({ alumnoId: student._id, esPlantilla: false })
                                         .sort({ createdAt: -1 });
            
            // Le pegamos el título del plan (o un aviso si no tiene)
            student.planActivoNombre = planActivo ? planActivo.titulo : 'Sin rutina asignada';
        }
            
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener alumnos' });
    }
};
module.exports = { createStudent,getStudents };