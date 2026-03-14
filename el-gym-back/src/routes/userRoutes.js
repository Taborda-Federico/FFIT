const express = require('express');
const router = express.Router();
const { createStudent, getStudents, renewSubscription, deleteStudent } = require('../controllers/userController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.post('/', protect, admin, createStudent);
router.get('/', protect, admin, getStudents);
router.put('/:id/renew', protect, admin, renewSubscription);
router.delete('/:id', protect, admin, deleteStudent);
module.exports = router;