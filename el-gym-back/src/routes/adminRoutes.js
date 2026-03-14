const express = require('express');
const router = express.Router();
const { getStudentProgress, createAdminNote } = require('../controllers/adminController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/student-progress/:alumnoId', protect, admin, getStudentProgress);
router.post('/student-notes', protect, admin, createAdminNote);

module.exports = router;