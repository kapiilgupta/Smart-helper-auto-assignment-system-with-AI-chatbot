const Helper = require('../models/Helper');
const Booking = require('../models/Booking');
const { handleHelperRejection, cancelResponseTimeout } = require('../services/reassignmentService');

/**
 * Initialize Socket.IO event handlers
 * @param {Object} io - Socket.IO instance
 */
const initializeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log(`[Socket.IO] New client connected: ${socket.id}`);

        // Join user/helper specific room
        socket.on('join', (data) => {
            const { userId, role } = data;
            const room = `${role}_${userId}`;
            socket.join(room);
            socket.userId = userId;
            socket.userRole = role;
            console.log(`[Socket.IO] ${role} ${userId} joined room: ${room}`);
        });

        // ==================== HELPER EVENTS ====================

        /**
         * Helper comes online - Update availability
         */
        socket.on('helper:connect', async (data) => {
            try {
                const { helperId } = data;
                console.log(`[Socket.IO] Helper ${helperId} coming online`);

                await Helper.findByIdAndUpdate(helperId, {
                    availability: true
                });

                socket.emit('helper:connected', {
                    message: 'You are now online and available for bookings'
                });

                console.log(`[Socket.IO] Helper ${helperId} is now available`);
            } catch (error) {
                console.error('[Socket.IO] Error in helper:connect:', error.message);
                socket.emit('error', { message: 'Failed to update availability' });
            }
        });

        /**
         * Update helper GPS coordinates
         */
        socket.on('helper:location-update', async (data) => {
            try {
                const { helperId, coordinates } = data; // coordinates: [longitude, latitude]

                if (!coordinates || coordinates.length !== 2) {
                    throw new Error('Invalid coordinates format');
                }

                console.log(`[Socket.IO] Updating location for helper ${helperId}`);

                await Helper.findByIdAndUpdate(helperId, {
                    location: {
                        type: 'Point',
                        coordinates: coordinates
                    }
                });

                socket.emit('helper:location-updated', {
                    message: 'Location updated successfully',
                    coordinates
                });

                console.log(`[Socket.IO] Helper ${helperId} location updated to [${coordinates}]`);
            } catch (error) {
                console.error('[Socket.IO] Error in helper:location-update:', error.message);
                socket.emit('error', { message: 'Failed to update location' });
            }
        });

        /**
         * Helper disconnects - Update availability to offline
         */
        socket.on('helper:disconnect', async (data) => {
            try {
                const { helperId } = data;
                console.log(`[Socket.IO] Helper ${helperId} going offline`);

                await Helper.findByIdAndUpdate(helperId, {
                    availability: false
                });

                console.log(`[Socket.IO] Helper ${helperId} is now offline`);
            } catch (error) {
                console.error('[Socket.IO] Error in helper:disconnect:', error.message);
            }
        });

        // ==================== BOOKING EVENTS ====================

        /**
         * Notify assigned helper of new booking
         * (This is typically called from the booking controller)
         */
        socket.on('booking:new', async (data) => {
            const { helperId, booking } = data;
            console.log(`[Socket.IO] Notifying helper ${helperId} of new booking`);

            io.to(`helper_${helperId}`).emit('booking:new', {
                bookingId: booking._id,
                booking,
                message: 'New booking assigned! Please respond within 30 seconds.',
                timeout: 30
            });
        });

        /**
         * Helper accepts booking
         */
        socket.on('booking:accept', async (data) => {
            try {
                const { bookingId, helperId } = data;
                console.log(`[Socket.IO] Helper ${helperId} accepting booking ${bookingId}`);

                const booking = await Booking.findById(bookingId)
                    .populate('userId', '-password')
                    .populate('serviceId');

                if (!booking) {
                    throw new Error('Booking not found');
                }

                if (booking.helperId.toString() !== helperId) {
                    throw new Error('Not authorized to accept this booking');
                }

                // Cancel timeout
                cancelResponseTimeout(bookingId);

                // Update booking status
                booking.status = 'accepted';
                await booking.save();

                // Notify helper
                socket.emit('booking:accepted', {
                    message: 'Booking accepted successfully',
                    booking
                });

                // Notify user
                io.to(`user_${booking.userId._id}`).emit('booking:status', {
                    bookingId: booking._id,
                    status: 'accepted',
                    message: 'Helper accepted your booking!',
                    booking
                });

                console.log(`[Socket.IO] Booking ${bookingId} accepted by helper ${helperId}`);
            } catch (error) {
                console.error('[Socket.IO] Error in booking:accept:', error.message);
                socket.emit('error', { message: error.message });
            }
        });

        /**
         * Helper rejects booking - Trigger reassignment
         */
        socket.on('booking:reject', async (data) => {
            try {
                const { bookingId, helperId, reason } = data;
                console.log(`[Socket.IO] Helper ${helperId} rejecting booking ${bookingId}`);

                const booking = await Booking.findById(bookingId);

                if (!booking) {
                    throw new Error('Booking not found');
                }

                if (booking.helperId.toString() !== helperId) {
                    throw new Error('Not authorized to reject this booking');
                }

                // Cancel timeout
                cancelResponseTimeout(bookingId);

                // Handle rejection and reassignment
                const reassignmentResult = await handleHelperRejection(
                    bookingId,
                    helperId,
                    reason || 'Helper rejected the booking',
                    io
                );

                // Notify helper
                socket.emit('booking:rejected', {
                    message: 'Booking rejected',
                    bookingId
                });

                console.log(`[Socket.IO] Booking ${bookingId} rejected and reassigned`);
            } catch (error) {
                console.error('[Socket.IO] Error in booking:reject:', error.message);
                socket.emit('error', { message: error.message });
            }
        });

        /**
         * Update booking status (in-progress, completed, etc.)
         */
        socket.on('booking:status', async (data) => {
            try {
                const { bookingId, helperId, status } = data;
                console.log(`[Socket.IO] Updating booking ${bookingId} status to ${status}`);

                const booking = await Booking.findById(bookingId)
                    .populate('userId', '-password')
                    .populate('helperId', '-password');

                if (!booking) {
                    throw new Error('Booking not found');
                }

                if (booking.helperId._id.toString() !== helperId) {
                    throw new Error('Not authorized to update this booking');
                }

                // Update status
                booking.status = status;

                if (status === 'completed') {
                    booking.completedAt = new Date();

                    // Update helper stats
                    await Helper.findByIdAndUpdate(helperId, {
                        availability: true,
                        $pull: { currentBookings: bookingId },
                        $inc: { completedBookings: 1 }
                    });
                }

                await booking.save();

                // Notify helper
                socket.emit('booking:status-updated', {
                    message: 'Booking status updated',
                    booking
                });

                // Notify user
                io.to(`user_${booking.userId._id}`).emit('booking:status', {
                    bookingId: booking._id,
                    status,
                    message: `Booking status updated to ${status}`,
                    booking
                });

                console.log(`[Socket.IO] Booking ${bookingId} status updated to ${status}`);
            } catch (error) {
                console.error('[Socket.IO] Error in booking:status:', error.message);
                socket.emit('error', { message: error.message });
            }
        });

        // ==================== GENERAL EVENTS ====================

        /**
         * Leave room
         */
        socket.on('leave', (data) => {
            const { userId, role } = data;
            const room = `${role}_${userId}`;
            socket.leave(room);
            console.log(`[Socket.IO] ${role} ${userId} left room: ${room}`);
        });

        /**
         * Handle disconnection
         */
        socket.on('disconnect', async () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);

            // If it's a helper, mark as offline
            if (socket.userRole === 'helper' && socket.userId) {
                try {
                    await Helper.findByIdAndUpdate(socket.userId, {
                        availability: false
                    });
                    console.log(`[Socket.IO] Helper ${socket.userId} marked as offline due to disconnect`);
                } catch (error) {
                    console.error('[Socket.IO] Error updating helper availability on disconnect:', error.message);
                }
            }
        });
    });

    console.log('[Socket.IO] Event handlers initialized');
};

module.exports = { initializeSocket };
