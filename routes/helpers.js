const express = require('express');
const router = express.Router();
const {
    getNearbyHelpers,
    updateHelperLocation,
    toggleAvailability,
    getHelperBookings,
    acceptBooking,
    rejectBooking
} = require('../controllers/helperController');
const { verifyToken, isHelper } = require('../middleware/authMiddleware');

// Public routes
router.get('/nearby', getNearbyHelpers);

// Helper-only routes
router.put('/location', verifyToken, isHelper, updateHelperLocation);
router.put('/availability', verifyToken, isHelper, toggleAvailability);
router.get('/bookings', verifyToken, isHelper, getHelperBookings);
router.put('/bookings/:id/accept', verifyToken, isHelper, acceptBooking);
router.put('/bookings/:id/reject', verifyToken, isHelper, rejectBooking);

module.exports = router;
