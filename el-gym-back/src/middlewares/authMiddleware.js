const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            // Antes esto no se chequeaba: un token válido y sin expirar de
            // un usuario que ya fue borrado (ej. deleteStudent) dejaba
            // pasar la request con req.user = null. Los controllers que no
            // esperan eso explotaban con un 500 genérico en vez de un 401
            // claro que le diga al cliente "iniciá sesión de nuevo".
            if (!req.user) {
                return res.status(401).json({ message: 'No autorizado, el usuario ya no existe' });
            }

            return next();
        } catch (error) {
            // Antes, si `token` terminaba en un valor falsy después de este
            // catch (pasa con un header "Bearer" sin nada después: el split
            // da undefined y jwt.verify tira ANTES de llegar a asignar nada
            // más), la ejecución seguía de largo hasta el `if (!token)` de
            // abajo y respondía 401 UNA SEGUNDA VEZ — en Express real eso
            // dispara "Cannot set headers after they are sent". El `return`
            // corta acá, una sola respuesta siempre.
            return res.status(401).json({ message: 'No autorizado, token falló' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no hay token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'No autorizado. Solo Administradores.' });
    }
};

module.exports = { protect, admin };