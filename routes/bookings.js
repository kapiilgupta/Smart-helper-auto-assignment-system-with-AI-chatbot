const express = require('express');
const router = express.Router();
const {
    createBooking,
    getUserBookings,
    getHelperBookings,
    getBookingById,
    acceptBooking,
    rejectBooking,
    updateBookingStatus,
    cancelBooking
} = require('../controllers/bookingController');
const { verifyToken, isUser, isHelper } = require('../middleware/authMiddleware');

// User routes
router.post('/', verifyToken, isUser, createBooking);
router.get('/', verifyToken, getUserBookings);
router.delete('/:id', verifyToken, isUser, cancelBooking);

// Helper routes
router.get('/helper', verifyToken, isHelper, getHelperBookings);
router.put('/:id/accept', verifyToken, isHelper, acceptBooking);
router.put('/:id/reject', verifyToken, isHelper, rejectBooking);
router.put('/:id/status', verifyToken, isHelper, updateBookingStatus);

// Shared routes
router.get('/:id', verifyToken, getBookingById);

module.exports = router;
