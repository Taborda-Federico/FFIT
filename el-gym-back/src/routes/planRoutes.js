const express = require('express');
const router = express.Router();
const { publicarPlan, guardarPlantilla, getPlantillas } = require('../controllers/planController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.post('/publicar', protect, admin, publicarPlan);
router.post('/plantilla', protect, admin, guardarPlantilla);
router.get('/plantillas', protect, admin, getPlantillas);

module.exports = router;