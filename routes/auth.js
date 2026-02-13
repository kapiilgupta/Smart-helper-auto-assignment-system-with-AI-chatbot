const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    registerHelper,
    loginHelper,
    logout
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// User routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Helper routes
router.post('/helper/register', registerHelper);
router.post('/helper/login', loginHelper);

// Logout route (for both users and helpers)
router.post('/logout', verifyToken, logout);

module.exports = router;
