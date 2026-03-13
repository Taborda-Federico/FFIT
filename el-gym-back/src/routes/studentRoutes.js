const express = require('express');
const router = express.Router();
const { getStudentDashboard, saveWorkoutLog, getMyHistory } = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/dashboard', protect, getStudentDashboard);
router.post('/workout', protect, saveWorkoutLog);
router.get('/history', protect, getMyHistory);

module.exports = router;