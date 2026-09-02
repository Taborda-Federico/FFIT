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
        // ARREGLADO — esto rompió una cuenta admin real en producción, ver
        // docs/CAMBIOS.md #10. Hasta esta mañana, acá se buscaba DIRECTO con
        // el regex case-insensitive de abajo. El problema: si en la base
        // hay DOS cuentas cuyo email difiere solo en mayúsculas (una vieja
        // o de prueba, y la cuenta real), un findOne con ese regex puede
        // devolver CUALQUIERA de las dos — Mongo no garantiza cuál de los
        // dos matches gana. Eso fue exactamente lo que pasó: un admin real
        // logueaba bien (la contraseña era correcta), pero terminaba
        // autenticado con la cuenta EQUIVOCADA, así que el sistema le
        // decía "no sos admin".
        //
        // La solución: probar PRIMERO el match exacto — el comportamiento
        // de toda la vida, que identifica sin ambigüedad la cuenta
        // correcta apenas exista una con ese casing exacto — y recién si
        // NINGUNA cuenta tiene ese casing exacto, caer al case-insensible
        // (que sigue resolviendo el caso que se quiso arreglar hoy: un
        // email cargado con otro casing que el que la persona escribe).
        let user = typeof email === 'string' ? await User.findOne({ email }) : null;
        if (!user) {
            const emailRegex = regexEmailExactoInsensible(email);
            if (emailRegex) {
                // .sort() como red de seguridad adicional: si llegado este
                // punto TODAVÍA hay más de una cuenta candidata (dos
                // casings distintos, ninguno igual al tipeado), se prefiere
                // la más vieja — la más probable de ser la cuenta real
                // original, no una duplicada creada después.
                user = await User.findOne({ email: emailRegex }).sort({ createdAt: 1 });
            }
        }

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