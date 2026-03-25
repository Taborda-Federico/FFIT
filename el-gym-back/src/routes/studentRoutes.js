const express = require('express');
const router = express.Router();
const { getStudentDashboard, saveWorkoutLog, getMyHistory } = require('../controllers/studentController');
const { protect } = require('../middlewares/authMiddleware');
const { getMyNotifications, markNotificationRead, changePassword } = require('../controllers/studentController');
router.get('/dashboard', protect, getStudentDashboard);
router.post('/workout', protect, saveWorkoutLog);
router.get('/history', protect, getMyHistory);
router.get('/notifications', protect, getMyNotifications);
router.put('/notifications/:id/read', protect, markNotificationRead);
router.put('/change-password', protect, changePassword);

module.exports = router;