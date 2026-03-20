const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerAdmin = async (req, res) => {
    const { nombre, email, password, adminSecret } = req.body;


    if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
        return res.status(401).json({ message: 'No tienes autorización para crear un administrador.' });
    }

    try {
        const userExists = await User.findOne({ email });
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
        const userExists = await User.findOne({ email });
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
        const user = await User.findOne({ email });

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