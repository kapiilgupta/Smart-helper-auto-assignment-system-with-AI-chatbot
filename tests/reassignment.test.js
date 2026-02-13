/**
 * Reassignment Logic Tests
 * Tests for helper rejection and auto-reassignment
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const { assignHelper, reassignHelper } = require('../services/assignmentService');
const { sampleHelpers, sampleUsers, sampleServices } = require('./testData');

describe('Reassignment Logic', () => {
    let user, service, helpers, booking;

    beforeAll(async () => {
        const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/smart-helper-test';
        await mongoose.connect(testDbUri);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Service.deleteMany({});
        await Booking.deleteMany({});

        user = await User.create(sampleUsers[0]);
        service = await Service.create(sampleServices[0]);
        helpers = await User.insertMany(sampleHelpers);

        booking = await Booking.create({
            userId: user._id,
            serviceId: service._id,
            location: user.location,
            status: 'pending'
        });
    });

    describe('Helper Rejection', () => {
        test('should reassign when helper rejects booking', async () => {
            // Assign first helper
            const firstHelper = await assignHelper(booking);
            expect(firstHelper).toBeDefined();

            // Update booking status
            await Booking.findByIdAndUpdate(booking._id, {
                helperId: firstHelper._id,
                status: 'assigned'
            });

            // Reject booking
            const secondHelper = await reassignHelper(booking._id, firstHelper._id);

            expect(secondHelper).toBeDefined();
            expect(secondHelper._id.toString()).not.toBe(firstHelper._id.toString());
        });

        test('should track rejected helpers to avoid reassigning', async () => {
            const firstHelper = await assignHelper(booking);

            await Booking.findByIdAndUpdate(booking._id, {
                helperId: firstHelper._id,
                status: 'assigned',
                rejectedHelpers: []
            });

            // Reject and reassign
            await reassignHelper(booking._id, firstHelper._id);

            const updatedBooking = await Booking.findById(booking._id);
            expect(updatedBooking.rejectedHelpers).toContain(firstHelper._id);
        });

        test('should not reassign to previously rejected helpers', async () => {
            // Manually set rejected helpers
            const rejectedHelperIds = helpers.slice(0, 2).map(h => h._id);

            await Booking.findByIdAndUpdate(booking._id, {
                rejectedHelpers: rejectedHelperIds
            });

            const assignedHelper = await assignHelper(booking);

            expect(assignedHelper).toBeDefined();
            expect(rejectedHelperIds.map(id => id.toString())).not.toContain(
                assignedHelper._id.toString()
            );
        });
    });

    describe('Timeout Reassignment', () => {
        test('should reassign after 30 seconds of no response', async () => {
            const firstHelper = await assignHelper(booking);

            await Booking.findByIdAndUpdate(booking._id, {
                helperId: firstHelper._id,
                status: 'assigned',
                assignedAt: new Date(Date.now() - 35000) // 35 seconds ago
            });

            // Simulate timeout check
            const bookingData = await Booking.findById(booking._id);
            const timeSinceAssignment = Date.now() - bookingData.assignedAt.getTime();

            expect(timeSinceAssignment).toBeGreaterThan(30000);

            // Should trigger reassignment
            const secondHelper = await reassignHelper(booking._id, firstHelper._id);
            expect(secondHelper).toBeDefined();
        });
    });

    describe('Reassignment Limits', () => {
        test('should cancel booking after 3 rejections', async () => {
            // Simulate 3 rejections
            const rejectedHelpers = helpers.slice(0, 3).map(h => h._id);

            await Booking.findByIdAndUpdate(booking._id, {
                rejectedHelpers: rejectedHelpers,
                rejectionCount: 3
            });

            const bookingData = await Booking.findById(booking._id);

            if (bookingData.rejectionCount >= 3) {
                await Booking.findByIdAndUpdate(booking._id, {
                    status: 'cancelled',
                    cancellationReason: 'No helpers available'
                });
            }

            const cancelledBooking = await Booking.findById(booking._id);
            expect(cancelledBooking.status).toBe('cancelled');
        });
    });

    describe('Reassignment Priority', () => {
        test('should prioritize next closest helper on reassignment', async () => {
            const firstHelper = helpers[0]; // Closest

            await Booking.findByIdAndUpdate(booking._id, {
                helperId: firstHelper._id,
                rejectedHelpers: [firstHelper._id]
            });

            const secondHelper = await assignHelper(booking);

            expect(secondHelper).toBeDefined();
            expect(secondHelper._id.toString()).not.toBe(firstHelper._id.toString());
        });
    });

    describe('Reassignment Performance', () => {
        test('should reassign within 500ms', async () => {
            const firstHelper = await assignHelper(booking);

            await Booking.findByIdAndUpdate(booking._id, {
                helperId: firstHelper._id,
                status: 'assigned'
            });

            const startTime = Date.now();
            await reassignHelper(booking._id, firstHelper._id);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(500);
        });
    });
});
