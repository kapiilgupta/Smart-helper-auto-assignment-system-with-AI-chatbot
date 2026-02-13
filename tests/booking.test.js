/**
 * Booking Workflow Tests
 * Tests for complete booking lifecycle
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const { sampleUsers, sampleHelpers, sampleServices } = require('./testData');

describe('Booking Workflow', () => {
    let server, userToken, helperToken, user, helper, service;

    beforeAll(async () => {
        const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/smart-helper-test';
        await mongoose.connect(testDbUri);
        server = app.listen(0);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await server.close();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Service.deleteMany({});
        await Booking.deleteMany({});

        // Create user and get token
        const userResponse = await request(app)
            .post('/api/auth/register')
            .send(sampleUsers[0]);
        userToken = userResponse.body.token;
        user = await User.findOne({ email: sampleUsers[0].email });

        // Create helper and get token
        const helperResponse = await request(app)
            .post('/api/auth/register')
            .send(sampleHelpers[0]);
        helperToken = helperResponse.body.token;
        helper = await User.findOne({ email: sampleHelpers[0].email });

        // Create service
        service = await Service.create(sampleServices[0]);
    });

    describe('Booking Creation', () => {
        test('should create new booking', async () => {
            const bookingData = {
                serviceId: service._id,
                location: user.location,
                scheduledTime: new Date(Date.now() + 3600000),
                notes: 'Test booking'
            };

            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .send(bookingData)
                .expect(201);

            expect(response.body).toHaveProperty('_id');
            expect(response.body.status).toBe('pending');
            expect(response.body.userId).toBe(user._id.toString());
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('should not create booking without authentication', async () => {
            await request(app)
                .post('/api/bookings')
                .send({
                    serviceId: service._id,
                    location: user.location
                })
                .expect(401);
        });
    });

    describe('Booking Status Updates', () => {
        let booking;

        beforeEach(async () => {
            booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });
        });

        test('should update booking status to assigned', async () => {
            const response = await request(app)
                .patch(`/api/bookings/${booking._id}/status`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ status: 'assigned', helperId: helper._id })
                .expect(200);

            expect(response.body.status).toBe('assigned');
            expect(response.body.helperId).toBe(helper._id.toString());
        });

        test('should update status to in-progress', async () => {
            await Booking.findByIdAndUpdate(booking._id, {
                status: 'assigned',
                helperId: helper._id
            });

            const response = await request(app)
                .patch(`/api/bookings/${booking._id}/status`)
                .set('Authorization', `Bearer ${helperToken}`)
                .send({ status: 'in-progress' })
                .expect(200);

            expect(response.body.status).toBe('in-progress');
        });

        test('should update status to completed', async () => {
            await Booking.findByIdAndUpdate(booking._id, {
                status: 'in-progress',
                helperId: helper._id
            });

            const response = await request(app)
                .patch(`/api/bookings/${booking._id}/status`)
                .set('Authorization', `Bearer ${helperToken}`)
                .send({ status: 'completed' })
                .expect(200);

            expect(response.body.status).toBe('completed');
            expect(response.body.completedAt).toBeDefined();
        });

        test('should not allow invalid status transitions', async () => {
            const response = await request(app)
                .patch(`/api/bookings/${booking._id}/status`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ status: 'completed' }) // Can't go from pending to completed
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Booking Retrieval', () => {
        let userBookings;

        beforeEach(async () => {
            userBookings = await Booking.insertMany([
                {
                    userId: user._id,
                    serviceId: service._id,
                    location: user.location,
                    status: 'pending'
                },
                {
                    userId: user._id,
                    serviceId: service._id,
                    location: user.location,
                    status: 'completed'
                }
            ]);
        });

        test('should get all user bookings', async () => {
            const response = await request(app)
                .get('/api/bookings')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.length).toBe(2);
        });

        test('should get booking by ID', async () => {
            const response = await request(app)
                .get(`/api/bookings/${userBookings[0]._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body._id).toBe(userBookings[0]._id.toString());
        });

        test('should filter bookings by status', async () => {
            const response = await request(app)
                .get('/api/bookings?status=completed')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.length).toBe(1);
            expect(response.body[0].status).toBe('completed');
        });
    });

    describe('Booking Cancellation', () => {
        let booking;

        beforeEach(async () => {
            booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                location: user.location,
                status: 'pending'
            });
        });

        test('should cancel booking', async () => {
            const response = await request(app)
                .delete(`/api/bookings/${booking._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(response.body.status).toBe('cancelled');
        });

        test('should not cancel completed booking', async () => {
            await Booking.findByIdAndUpdate(booking._id, {
                status: 'completed'
            });

            await request(app)
                .delete(`/api/bookings/${booking._id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(400);
        });
    });

    describe('Helper Booking Actions', () => {
        let booking;

        beforeEach(async () => {
            booking = await Booking.create({
                userId: user._id,
                serviceId: service._id,
                helperId: helper._id,
                location: user.location,
                status: 'assigned'
            });
        });

        test('should accept booking', async () => {
            const response = await request(app)
                .post(`/api/bookings/${booking._id}/accept`)
                .set('Authorization', `Bearer ${helperToken}`)
                .expect(200);

            expect(response.body.status).toBe('accepted');
        });

        test('should reject booking', async () => {
            const response = await request(app)
                .post(`/api/bookings/${booking._id}/reject`)
                .set('Authorization', `Bearer ${helperToken}`)
                .expect(200);

            expect(response.body.rejectedHelpers).toContain(helper._id.toString());
        });
    });
});
