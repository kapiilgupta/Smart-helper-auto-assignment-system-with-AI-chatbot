const express = require('express');
const router = express.Router();
const {
    getUserProfile,
    updateUserProfile,
    getUserBookings
} = require('../controllers/userController');
const { verifyToken, isUser } = require('../middleware/authMiddleware');

// All routes require authentication and user role
router.get('/profile', verifyToken, isUser, getUserProfile);
router.put('/profile', verifyToken, isUser, updateUserProfile);
router.get('/bookings', verifyToken, isUser, getUserBookings);

module.exports = router;
