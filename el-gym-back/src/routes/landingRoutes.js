const express = require('express');
const router = express.Router();
const { getMiLanding, updateMiLanding, getPublicLanding } = require('../controllers/landingController');
const { protect, admin } = require('../middlewares/authMiddleware');

router.get('/my-site', protect, admin, getMiLanding);
router.put('/my-site', protect, admin, updateMiLanding);
router.get('/public', getPublicLanding);
module.exports = router;