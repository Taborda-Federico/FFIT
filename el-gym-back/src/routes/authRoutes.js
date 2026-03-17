const express = require('express');
const router = express.Router();
const { registerAdmin, createAdmin, login } = require('../controllers/authController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.post('/register-admin', registerAdmin);
router.post('/create-admin', protect, admin, createAdmin);
router.post('/login', login);

module.exports = router;