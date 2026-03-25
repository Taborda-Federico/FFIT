const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/db');

connectDB();

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
app.use('/api/admin', require('./routes/adminRoutes'))
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🔥 Servidor corriendo en el puerto ${PORT}`);
});