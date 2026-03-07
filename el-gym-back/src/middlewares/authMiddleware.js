const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verifica que el usuario que hace la petición tenga un Token válido
const protect = async (req, res, next) => {
    let token;
    
    // El token viaja en los headers como "Bearer [token]"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            // Desencriptamos el token para saber quién es
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // Buscamos al usuario en la BD y lo adjuntamos a la petición (sin la contraseña)
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401).json({ message: 'No autorizado, token falló' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

// Verifica que el usuario logueado tenga el rol de 'admin'
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next(); // Tiene permiso, lo dejamos pasar
    } else {
        res.status(401).json({ message: 'No autorizado. Solo Administradores.' });
    }
};

module.exports = { protect, admin };