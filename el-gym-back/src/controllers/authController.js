const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { regexEmailExactoInsensible } = require('../utils/email');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerAdmin = async (req, res) => {
    const { nombre, email, password, adminSecret } = req.body;


    if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
        return res.status(401).json({ message: 'No tienes autorización para crear un administrador.' });
    }

    try {
        // Chequeo de duplicado ignorando mayúsculas/minúsculas (ver
        // src/utils/email.js) — evita, de acá en más, crear dos cuentas
        // admin que sean el mismo email para cualquier persona real
        // ("Juan@x.com" y "juan@x.com" ya no se consideran distintas).
        const emailRegex = regexEmailExactoInsensible(email);
        if (!emailRegex) {
            return res.status(400).json({ message: 'Email inválido' });
        }
        const userExists = await User.findOne({ email: emailRegex });
        if (userExists) return res.status(400).json({ message: 'El usuario ya existe' });

        const user = await User.create({
            nombre, email, password, role: 'admin'
        });

        res.status(201).json({
            _id: user._id,
            nombre: user.nombre,
            role: user.role,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

exports.createAdmin = async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const emailRegex = regexEmailExactoInsensible(email);
        if (!emailRegex) {
            return res.status(400).json({ message: 'Email inválido' });
        }
        const userExists = await User.findOne({ email: emailRegex });
        if (userExists) return res.status(400).json({ message: 'El usuario ya existe' });

        const user = await User.create({
            nombre, email, password, role: 'admin'
        });

        res.status(201).json({
            _id: user._id,
            nombre: user.nombre,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Antes esto era `User.findOne({ email })`: comparación exacta y
        // case-sensitive. Si el email quedó guardado con mayúsculas (lo
        // carga un admin, o el propio alumno se registra escribiendo el
        // teclado con autocapitalización) pero la persona después inicia
        // sesión escribiendo todo en minúscula — el caso más común — el
        // login fallaba con "Email o contraseña incorrectos" aunque la
        // contraseña fuera perfecta. Ver src/utils/email.js para el porqué
        // de este enfoque (sin migrar el dato guardado).
        const emailRegex = regexEmailExactoInsensible(email);
        if (!emailRegex) {
            return res.status(401).json({ message: 'Email o contraseña incorrectos' });
        }
        const user = await User.findOne({ email: emailRegex });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                nombre: user.nombre,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Email o contraseña incorrectos' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor' });
    }
};