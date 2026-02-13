/**
 * Helper Assignment Algorithm Tests
 * Tests for the smart helper assignment logic
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const { assignHelper } = require('../services/assignmentService');
const { sampleHelpers, sampleUsers, sampleServices, testLocations } = require('./testData');

describe('Helper Assignment Algorithm', () => {
    let user, service, helpers;

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

        // Create test user
        user = await User.create(sampleUsers[0]);

        // Create test service
        service = await Service.create(sampleServices[0]); // Plumbing

        // Create test helpers
        helpers = await User.insertMany(sampleHelpers);
    });

    describe('Distance-Based Assignment', () => {
        test('should assign closest available helper', async () => {
            const booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const assignedHelper = await assignHelper(booking);

            expect(assignedHelper).toBeDefined();
            expect(assignedHelper.name).toBe('Rajesh Kumar'); // Closest helper
        });

        test('should not assign offline helpers', async () => {
            // Set all helpers except offline one to unavailable
            await User.updateMany(
                { role: 'helper', name: { $ne: 'Offline Helper' } },
                { availability: false }
            );

            const booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const assignedHelper = await assignHelper(booking);

            expect(assignedHelper).toBeNull();
        });

        test('should consider helper skills when assigning', async () => {
            const cleaningService = await Service.create(sampleServices[2]); // Cleaning

            const booking = await Booking.create({
                userId: user._id,
                serviceId: cleaningService._id,
                location: user.location,
                status: 'pending'
            });

            const assignedHelper = await assignHelper(booking);

            expect(assignedHelper).toBeDefined();
            expect(assignedHelper.skills).toContain('cleaning');
        });
    });

    describe('Rating-Based Assignment', () => {
        test('should prioritize higher-rated helpers when distances are similar', async () => {
            // Update helpers to be at similar distances
            await User.updateMany(
                { role: 'helper' },
                {
                    location: {
                        type: 'Point',
                        coordinates: [77.2090, 28.6139]
                    }
                }
            );

            const booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const assignedHelper = await assignHelper(booking);

            expect(assignedHelper).toBeDefined();
            expect(assignedHelper.rating).toBeGreaterThanOrEqual(4.5);
        });
    });

    describe('Geofencing', () => {
        test('should only assign helpers within 10km radius', async () => {
            // Create a helper far away (Mumbai)
            await User.create({
                ...sampleHelpers[0],
                email: 'far.helper@example.com',
                location: {
                    type: 'Point',
                    coordinates: [72.8777, 19.0760] // Mumbai
                }
            });

            const booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const assignedHelper = await assignHelper(booking);

            // Should not assign the far helper
            expect(assignedHelper.location.coordinates[0]).toBeCloseTo(77.2090, 1);
        });
    });

    describe('Load Balancing', () => {
        test('should consider helper current load', async () => {
            // Create multiple bookings for one helper
            const busyHelper = helpers[0];

            for (let i = 0; i < 3; i++) {
                await Booking.create({
                    userId: user._id,
                    serviceId: service._id,
                    helperId: busyHelper._id,
                    status: 'in-progress',
                    location: user.location
                });
            }

            const newBooking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const assignedHelper = await assignHelper(newBooking);

            // Should assign a less busy helper
            expect(assignedHelper._id.toString()).not.toBe(busyHelper._id.toString());
        });
    });

    describe('Assignment Performance', () => {
        test('should assign helper within 1 second', async () => {
            const booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const startTime = Date.now();
            await assignHelper(booking);
            const endTime = Date.now();

            const duration = endTime - startTime;
            expect(duration).toBeLessThan(1000); // Less than 1 second
        });

        test('should handle large number of helpers efficiently', async () => {
            // Create 100 additional helpers
            const manyHelpers = Array.from({ length: 100 }, (_, i) => ({
                ...sampleHelpers[0],
                email: `helper${i}@example.com`,
                phone: `+9198765432${i.toString().padStart(2, '0')}`
            }));

            await User.insertMany(manyHelpers);

            const booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });

            const startTime = Date.now();
            const assignedHelper = await assignHelper(booking);
            const endTime = Date.now();

            expect(assignedHelper).toBeDefined();
            expect(endTime - startTime).toBeLessThan(2000); // Less than 2 seconds
        });
    });
});
