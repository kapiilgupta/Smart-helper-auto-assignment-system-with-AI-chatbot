const Booking = require('../models/Booking');
const Helper = require('../models/Helper');
const { findAndAssignHelper } = require('./assignmentService');

// Store active timeouts for bookings
const bookingTimeouts = new Map();

/**
 * Handle helper rejection and trigger reassignment
 * @param {String} bookingId - The booking ID
 * @param {String} helperId - The helper who rejected
 * @param {String} reason - Rejection reason
 * @param {Object} io - Socket.IO instance for notifications
 * @returns {Object} - Reassignment result
 */
const handleHelperRejection = async (bookingId, helperId, reason, io) => {
    try {
        console.log(`[Reassignment Service] Handling rejection for booking: ${bookingId}`);

        // Step 1: Find the booking and mark current helper as rejected
        const booking = await Booking.findById(bookingId)
            .populate('serviceId')
            .populate('userId', '-password');

        if (!booking) {
            throw new Error('Booking not found');
        }

        // Step 2: Add rejection to assignmentHistory array
        const historyEntry = booking.assignmentHistory.find(
            h => h.helperId.toString() === helperId && h.status === 'assigned'
        );

        if (historyEntry) {
            historyEntry.status = 'rejected';
            historyEntry.rejectedAt = new Date();
            historyEntry.reason = reason;
        }

        booking.rejectionCount += 1;

        // Make helper available again
        await Helper.findByIdAndUpdate(helperId, {
            availability: true,
            $pull: { currentBookings: bookingId }
        });

        console.log(`[Reassignment Service] Rejection count: ${booking.rejectionCount}`);

        // Step 3: If rejection count > 3, mark booking as 'no_helper_available'
        if (booking.rejectionCount > 3) {
            booking.status = 'no_helper_available';
            booking.helperId = null;
            await booking.save();

            console.log(`[Reassignment Service] Max rejections reached. Booking marked as no_helper_available`);

            // Notify user via Socket.IO
            if (io) {
                io.to(`user_${booking.userId._id}`).emit('booking_failed', {
                    bookingId: booking._id,
                    message: 'Unable to find available helper. Please try again later.',
                    booking
                });
            }

            return {
                success: false,
                message: 'Maximum rejection count reached. No helper available.',
                booking
            };
        }

        // Step 4: Call findAndAssignHelper again with next best helper
        booking.helperId = null;
        booking.status = 'pending';
        await booking.save();

        console.log(`[Reassignment Service] Attempting reassignment...`);

        try {
            const assignmentResult = await findAndAssignHelper(
                bookingId,
                booking.location,
                booking.serviceId.category
            );

            console.log(`[Reassignment Service] Successfully reassigned to: ${assignmentResult.assignedHelper.name}`);

            // Notify new helper via Socket.IO
            if (io) {
                io.to(`helper_${assignmentResult.assignedHelper.id}`).emit('new_booking', {
                    bookingId: booking._id,
                    booking: assignmentResult.booking,
                    message: 'New booking assigned to you!'
                });

                // Notify user about reassignment
                io.to(`user_${booking.userId._id}`).emit('helper_reassigned', {
                    bookingId: booking._id,
                    helper: assignmentResult.assignedHelper,
                    message: 'A new helper has been assigned to your booking.'
                });
            }

            // Step 5: Set 30-second timeout for helper response
            startResponseTimeout(bookingId, assignmentResult.assignedHelper.id, io);

            return {
                success: true,
                message: 'Booking reassigned successfully',
                booking: assignmentResult.booking,
                assignedHelper: assignmentResult.assignedHelper
            };

        } catch (assignmentError) {
            console.error(`[Reassignment Service] Reassignment failed:`, assignmentError.message);

            booking.status = 'pending';
            await booking.save();

            // Notify user via Socket.IO
            if (io) {
                io.to(`user_${booking.userId._id}`).emit('reassignment_failed', {
                    bookingId: booking._id,
                    message: 'Unable to reassign helper. Searching for alternatives...',
                    booking
                });
            }

            throw new Error('No alternate helper available for reassignment');
        }

    } catch (error) {
        console.error(`[Reassignment Service] Error:`, error.message);
        throw error;
    }
};

/**
 * Start 30-second timeout for helper response
 * @param {String} bookingId - The booking ID
 * @param {String} helperId - The assigned helper ID
 * @param {Object} io - Socket.IO instance
 */
const startResponseTimeout = (bookingId, helperId, io) => {
    // Clear existing timeout if any
    if (bookingTimeouts.has(bookingId)) {
        clearTimeout(bookingTimeouts.get(bookingId));
    }

    console.log(`[Reassignment Service] Starting 30-second timeout for booking: ${bookingId}`);

    const timeout = setTimeout(async () => {
        try {
            const booking = await Booking.findById(bookingId).populate('userId', '-password');

            // Only auto-reassign if still in 'assigned' status (not accepted yet)
            if (booking && booking.status === 'assigned') {
                console.log(`[Reassignment Service] Timeout reached. Auto-reassigning booking: ${bookingId}`);

                // Notify helper about timeout
                if (io) {
                    io.to(`helper_${helperId}`).emit('booking_timeout', {
                        bookingId: booking._id,
                        message: 'Booking request timed out'
                    });
                }

                // Trigger reassignment
                await handleHelperRejection(
                    bookingId,
                    helperId,
                    'No response within 30 seconds',
                    io
                );
            }

            // Remove timeout from map
            bookingTimeouts.delete(bookingId);

        } catch (error) {
            console.error(`[Reassignment Service] Timeout handler error:`, error.message);
        }
    }, 30000); // 30 seconds

    bookingTimeouts.set(bookingId, timeout);
};

/**
 * Cancel response timeout (called when helper accepts)
 * @param {String} bookingId - The booking ID
 */
const cancelResponseTimeout = (bookingId) => {
    if (bookingTimeouts.has(bookingId)) {
        clearTimeout(bookingTimeouts.get(bookingId));
        bookingTimeouts.delete(bookingId);
        console.log(`[Reassignment Service] Cancelled timeout for booking: ${bookingId}`);
    }
};

/**
 * Notify helper about new booking assignment
 * @param {String} helperId - The helper ID
 * @param {Object} booking - The booking object
 * @param {Object} io - Socket.IO instance
 */
const notifyHelperAssignment = (helperId, booking, io) => {
    if (io) {
        io.to(`helper_${helperId}`).emit('new_booking', {
            bookingId: booking._id,
            booking,
            message: 'New booking assigned to you! Please respond within 30 seconds.',
            timeout: 30
        });
    }
};

/**
 * Notify user about booking status
 * @param {String} userId - The user ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 * @param {Object} io - Socket.IO instance
 */
const notifyUser = (userId, event, data, io) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

module.exports = {
    handleHelperRejection,
    startResponseTimeout,
    cancelResponseTimeout,
    notifyHelperAssignment,
    notifyUser
};
