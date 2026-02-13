/**
 * Authentication API Tests
 * Tests for user registration, login, and JWT authentication
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { sampleUsers } = require('./testData');

describe('Authentication API', () => {
    let server;

    beforeAll(async () => {
        // Connect to test database
        const testDbUri = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/smart-helper-test';
        await mongoose.connect(testDbUri);
        server = app.listen(0); // Random port
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await server.close();
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('POST /api/auth/register', () => {
        test('should register a new user successfully', async () => {
            const userData = sampleUsers[0];

            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(201);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', userData.email);
            expect(response.body.user).not.toHaveProperty('password');
        });

        test('should not register user with existing email', async () => {
            const userData = sampleUsers[0];

            // Register first time
            await request(app)
                .post('/api/auth/register')
                .send(userData);

            // Try to register again
            const response = await request(app)
                .post('/api/auth/register')
                .send(userData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User'
                    // Missing email and password
                })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('should hash password before saving', async () => {
            const userData = sampleUsers[0];

            await request(app)
                .post('/api/auth/register')
                .send(userData);

            const user = await User.findOne({ email: userData.email });
            expect(user.password).not.toBe(userData.password);
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Register a user first
            await request(app)
                .post('/api/auth/register')
                .send(sampleUsers[0]);
        });

        test('should login with correct credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: sampleUsers[0].email,
                    password: sampleUsers[0].password
                })
                .expect(200);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user).toHaveProperty('email', sampleUsers[0].email);
        });

        test('should not login with incorrect password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: sampleUsers[0].email,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });

        test('should not login with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('JWT Authentication', () => {
        let authToken;

        beforeEach(async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(sampleUsers[0]);

            authToken = response.body.token;
        });

        test('should access protected route with valid token', async () => {
            const response = await request(app)
                .get('/api/user/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('email', sampleUsers[0].email);
        });

        test('should not access protected route without token', async () => {
            await request(app)
                .get('/api/user/profile')
                .expect(401);
        });

        test('should not access protected route with invalid token', async () => {
            await request(app)
                .get('/api/user/profile')
                .set('Authorization', 'Bearer invalidtoken')
                .expect(401);
        });
    });

    describe('Role-Based Access Control', () => {
        let userToken, helperToken;

        beforeEach(async () => {
            // Register user
            const userResponse = await request(app)
                .post('/api/auth/register')
                .send(sampleUsers[0]);
            userToken = userResponse.body.token;

            // Register helper
            const helperResponse = await request(app)
                .post('/api/auth/register')
                .send({ ...sampleUsers[1], role: 'helper' });
            helperToken = helperResponse.body.token;
        });

        test('should allow helper to access helper routes', async () => {
            const response = await request(app)
                .get('/api/helper/dashboard')
                .set('Authorization', `Bearer ${helperToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        test('should not allow user to access helper routes', async () => {
            await request(app)
                .get('/api/helper/dashboard')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });
});
