const Helper = require('../models/Helper');
const Booking = require('../models/Booking');

/**
 * Get nearby helpers (for map view)
 * @route GET /api/helpers/nearby
 * @access Public
 */
const getNearbyHelpers = async (req, res) => {
    try {
        const { lng, lat, maxDistance = 10000, skills } = req.query;

        if (!lng || !lat) {
            return res.status(400).json({ message: 'Longitude and latitude are required' });
        }

        const query = {
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(maxDistance) // in meters
                }
            }
        };

        // Filter by skills if provided
        if (skills) {
            const skillsArray = skills.split(',');
            query.skills = { $in: skillsArray };
        }

        const helpers = await Helper.find(query)
            .select('-password')
            .limit(20);

        res.json({ helpers, count: helpers.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Update helper location
 * @route PUT /api/helpers/location
 * @access Private (Helper only)
 */
const updateHelperLocation = async (req, res) => {
    try {
        const { coordinates } = req.body; // [longitude, latitude]

        if (!coordinates || coordinates.length !== 2) {
            return res.status(400).json({ message: 'Invalid coordinates format. Expected [longitude, latitude]' });
        }

        const helper = await Helper.findByIdAndUpdate(
            req.user.id,
            {
                location: {
                    type: 'Point',
                    coordinates: coordinates
                }
            },
            { new: true }
        ).select('-password');

        res.json({
            message: 'Location updated successfully',
            location: helper.location
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Toggle helper availability status
 * @route PUT /api/helpers/availability
 * @access Private (Helper only)
 */
const toggleAvailability = async (req, res) => {
    try {
        const { availability } = req.body;

        if (typeof availability !== 'boolean') {
            return res.status(400).json({ message: 'Availability must be a boolean value' });
        }

        const helper = await Helper.findByIdAndUpdate(
            req.user.id,
            { availability },
            { new: true }
        ).select('-password');

        res.json({
            message: `Availability updated to ${availability ? 'online' : 'offline'}`,
            availability: helper.availability
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get helper's assigned bookings
 * @route GET /api/helpers/bookings
 * @access Private (Helper only)
 */
const getHelperBookings = async (req, res) => {
    try {
        const { status } = req.query;

        const filter = { helperId: req.user.id };
        if (status) {
            filter.status = status;
        }

        const bookings = await Booking.find(filter)
            .populate('serviceId')
            .populate('userId', '-password')
            .sort({ createdAt: -1 });

        res.json({ bookings, count: bookings.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Accept booking
 * @route PUT /api/helpers/bookings/:id/accept
 * @access Private (Helper only)
 */
const acceptBooking = async (req, res) => {
    try {
        const { cancelResponseTimeout } = require('../services/reassignmentService');

        const booking = await Booking.findById(req.params.id)
            .populate('userId', '-password')
            .populate('serviceId');

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.helperId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to accept this booking' });
        }

        // Cancel timeout
        cancelResponseTimeout(booking._id);

        booking.status = 'accepted';
        await booking.save();

        // Notify user via Socket.IO
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${booking.userId._id}`).emit('booking:status', {
                bookingId: booking._id,
                status: 'accepted',
                message: 'Helper accepted your booking!',
                booking
            });
        }

        res.json({ message: 'Booking accepted successfully', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Reject booking
 * @route PUT /api/helpers/bookings/:id/reject
 * @access Private (Helper only)
 */
const rejectBooking = async (req, res) => {
    try {
        const { reason } = req.body;
        const { handleHelperRejection, cancelResponseTimeout } = require('../services/reassignmentService');

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        if (booking.helperId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to reject this booking' });
        }

        // Cancel timeout
        cancelResponseTimeout(booking._id);

        // Get Socket.IO instance
        const io = req.app.get('io');

        // Handle rejection and reassignment
        try {
            const reassignmentResult = await handleHelperRejection(
                booking._id,
                req.user.id,
                reason || 'Helper rejected the booking',
                io
            );

            res.json({
                message: reassignmentResult.message,
                booking: reassignmentResult.booking
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

module.exports = {
    getNearbyHelpers,
    updateHelperLocation,
    toggleAvailability,
    getHelperBookings,
    acceptBooking,
    rejectBooking
};
