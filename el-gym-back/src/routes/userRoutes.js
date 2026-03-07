const express = require('express');
const router = express.Router();
const { createStudent, getStudents } = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Ruta para crear alumno. Fíjate cómo usamos "protect" y "admin" como filtros antes de crear al estudiante
router.post('/', protect, admin, createStudent);
router.get('/', protect, admin, getStudents); 
module.exports = router;