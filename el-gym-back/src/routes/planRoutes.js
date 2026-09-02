const express = require('express');
const router = express.Router();
const { publicarPlan, guardarPlantilla, getPlantillas, actualizarPlantilla, eliminarPlantilla } = require('../controllers/planController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.post('/publicar', protect, admin, publicarPlan);
router.post('/plantilla', protect, admin, guardarPlantilla);
router.get('/plantillas', protect, admin, getPlantillas);
router.put('/plantilla/:id', protect, admin, actualizarPlantilla);
router.delete('/plantilla/:id', protect, admin, eliminarPlantilla);

module.exports = router;