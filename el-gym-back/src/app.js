// src/app.js
//
// Construcción de la app de Express, separada de "arrancar el servidor"
// (server.js). Se separó así para poder testear la API con Supertest:
// Supertest necesita el objeto `app` de Express en memoria, sin que nada
// intente conectarse a Mongo real ni abrir un puerto real. server.js sigue
// siendo el único punto de entrada en producción (`npm start` / `npm run dev`)
// — este archivo no cambia ningún comportamiento, solo lo hace importable.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// SECURITY MIDDLEWARES
app.use(helmet());

// Limitador de peticiones generales (1000 req por 15 min por IP)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde'
});
app.use('/api/', apiLimiter);

app.use(cors({
    origin: ['http://localhost:5173', 'https://gimnasio-ffit.vercel.app', 'https://ffitwellnes.com'],
    credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API de FFIT+ funcionando al 100% 🚀');
});

app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/planes', require('./routes/planRoutes'));
app.use('/api/landing', require('./routes/landingRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

module.exports = app;
