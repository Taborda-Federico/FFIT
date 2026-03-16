const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

connectDB();

const app = express();
app.use(cors({
    origin: ['http://localhost:5173', 'https://gimnasio-ffit.vercel.app'],
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