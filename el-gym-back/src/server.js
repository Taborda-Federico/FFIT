// src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Carga las variables del .env
const connectDB = require('./config/db');

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares globales
app.use(cors()); // Permite peticiones desde React
app.use(express.json()); // Permite al servidor entender datos en formato JSON

// Ruta de prueba básica
app.get('/', (req, res) => {
    res.send('API de FFIT+ funcionando al 100% 🚀');
});

// Aquí luego importaremos nuestras rutas reales
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/planes', require('./routes/planRoutes'));
app.use('/api/landing', require('./routes/landingRoutes'));
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🔥 Servidor corriendo en el puerto ${PORT}`);
});