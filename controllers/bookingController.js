const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Helper = require('../models/Helper');
const { findAndAssignHelper } = require('../services/assignmentService');
const {
    handleHelperRejection,
    startResponseTimeout,
    cancelResponseTimeout,
    notifyHelperAssignment,
    notifyUser
} = require('../services/reassignmentService');

/**
 * Create a new booking and auto-assign helper
 * @route POST /api/bookings
 * @access Private (User only)
 */
const createBooking = async (req, res) => {
    try {
        const { serviceId, scheduledTime, location, notes } = req.body;
        const userId = req.user.id;

        // Validate service exists
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Create booking
        const booking = await Booking.create({
            userId,
            serviceId,
            scheduledTime,
            location,
            notes,
            status: 'pending'
        });

        console.log(`[Booking Controller] Created booking: ${booking._id}`);

        // Auto-assign helper
        try {
            const assignmentResult = await findAndAssignHelper(
                booking._id,
                location,
                service.category
            );

            // Get Socket.IO instance
            const io = req.app.get('io');

            // Notify helper via Socket.IO
            notifyHelperAssignment(assignmentResult.assignedHelper.id, assignmentResult.booking, io);

            // Start 30-second timeout
            startResponseTimeout(booking._id, assignmentResult.assignedHelper.id, io);

            // Notify user
            notifyUser(userId, 'helper_assigned', {
                bookingId: booking._id,
                helper: assignmentResult.assignedHelper,
                message: 'Helper assigned to your booking!'
            }, io);

            res.status(201).json({
                message: 'Booking created and helper assigned successfully',
                booking: assignmentResult.booking,
                assignedHelper: assignmentResult.assignedHelper,
                alternateHelpers: assignmentResult.alternateHelpers
            });
        } catch (assignmentError) {
            console.error('[Booking Controller] Assignment failed:', assignmentError.message);

            // Return booking even if assignment fails
            res.status(201).json({
                message: 'Booking created but no helper available',
                booking: await Booking.findById(booking._id).populate('serviceId'),
                error: assignmentError.message
            });
        }

    } catch (error) {
        console.error('[Booking Controller] Error:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get all bookings for logged-in user
 * @route GET /api/bookings
 * @access Private
 */
const getUserBookings = async (req, res) => {
    try {
        const userId = req.user.id;
        const bookings = await Booking.find({ userId })
            .populate('serviceId')
            .populate('helperId', '-password')
            .sort({ createdAt: -1 });

        res.json({ bookings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get bookings for logged-in helper
 * @route GET /api/bookings/helper
 * @access Private (Helper only)
 */
const getHelperBookings = async (req, res) => {
    try {
        const helperId = req.user.id;
        const bookings = await Booking.find({ helperId })
            .populate('serviceId')
            .populate('userId', '-password')
            .sort({ createdAt: -1 });

        res.json({ bookings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get booking by ID
 * @route GET /api/bookings/:id
 * @access Private
 */
const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate('serviceId')
            .populate('helperId', '-password')
            .populate('userId', '-password');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check authorization
        if (booking.userId._id.toString() !== req.user.id &&
            booking.helperId?._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this booking' });
        }

        res.json({ booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Helper accepts booking
 * @route PUT /api/bookings/:id/accept
 * @access Private (Helper only)
 */
const acceptBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id).populate('userId', '-password');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.helperId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Cancel timeout since helper accepted
        cancelResponseTimeout(booking._id);

        booking.status = 'accepted';
        await booking.save();

        // Notify user via Socket.IO
        const io = req.app.get('io');
        notifyUser(booking.userId._id, 'booking_accepted', {
            bookingId: booking._id,
            message: 'Helper accepted your booking!',
            booking
        }, io);

        res.json({ message: 'Booking accepted', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Helper rejects booking (triggers reassignment)
 * @route PUT /api/bookings/:id/reject
 * @access Private (Helper only)
 */
const rejectBooking = async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.helperId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Cancel timeout
        cancelResponseTimeout(booking._id);

        // Get Socket.IO instance
        const io = req.app.get('io');

        // Use reassignment service
        try {
            const reassignmentResult = await handleHelperRejection(
                booking._id,
                req.user.id,
                reason || 'Helper rejected the booking',
                io
            );

            res.json({
                message: reassignmentResult.message,
                booking: reassignmentResult.booking,
                assignedHelper: reassignmentResult.assignedHelper
            });
        } catch (reassignError) {
            res.json({
                message: 'Booking rejected but no alternate helper available',
                error: reassignError.message
            });
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update booking status
 * @route PUT /api/bookings/:id/status
 * @access Private (Helper only)
 */
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.helperId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = status;

        if (status === 'completed') {
            booking.completedAt = new Date();

            // Update helper stats
            await Helper.findByIdAndUpdate(req.user.id, {
                availability: true,
                $pull: { currentBookings: booking._id },
                $inc: { completedBookings: 1 }
            });
        }

        await booking.save();

        res.json({ message: 'Booking status updated', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Cancel booking
 * @route DELETE /api/bookings/:id
 * @access Private (User only)
 */
const cancelBooking = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        booking.status = 'cancelled';
        await booking.save();

        // Make helper available again if assigned
        if (booking.helperId) {
            await Helper.findByIdAndUpdate(booking.helperId, {
                availability: true,
                $pull: { currentBookings: booking._id }
            });
        }

        res.json({ message: 'Booking cancelled', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createBooking,
    getUserBookings,
    getHelperBookings,
    getBookingById,
    acceptBooking,
    rejectBooking,
    updateBookingStatus,
    cancelBooking
};
