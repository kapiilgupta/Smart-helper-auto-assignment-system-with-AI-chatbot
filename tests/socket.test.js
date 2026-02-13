/**
 * Socket.IO Event Handling Tests
 * Tests for real-time communication via Socket.IO
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { mockSocketEvents } = require('./testData');

describe('Socket.IO Event Handling', () => {
    let io, serverSocket, clientSocket, httpServer;

    beforeAll((done) => {
        httpServer = createServer();
        io = new Server(httpServer);

        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = new Client(`http://localhost:${port}`);

            io.on('connection', (socket) => {
                serverSocket = socket;
            });

            clientSocket.on('connect', done);
        });
    });

    afterAll(() => {
        io.close();
        clientSocket.close();
        httpServer.close();
    });

    describe('Connection Events', () => {
        test('should connect client to server', (done) => {
            expect(clientSocket.connected).toBe(true);
            done();
        });

        test('should join user room on connection', (done) => {
            const userId = '507f1f77bcf86cd799439011';

            clientSocket.emit('join', { userId });

            serverSocket.on('join', (data) => {
                expect(data.userId).toBe(userId);
                serverSocket.join(`user:${userId}`);
                done();
            });
        });

        test('should handle disconnection', (done) => {
            const testClient = new Client(`http://localhost:${httpServer.address().port}`);

            testClient.on('connect', () => {
                testClient.disconnect();
            });

            io.on('connection', (socket) => {
                socket.on('disconnect', () => {
                    done();
                });
            });
        });
    });

    describe('Booking Events', () => {
        test('should emit booking created event', (done) => {
            const bookingData = mockSocketEvents.bookingCreated.data;

            clientSocket.on('booking:created', (data) => {
                expect(data.bookingId).toBe(bookingData.bookingId);
                expect(data.userId).toBe(bookingData.userId);
                done();
            });

            serverSocket.emit('booking:created', bookingData);
        });

        test('should emit helper assigned event', (done) => {
            const assignmentData = mockSocketEvents.helperAssigned.data;

            clientSocket.on('booking:helper-assigned', (data) => {
                expect(data.bookingId).toBe(assignmentData.bookingId);
                expect(data.helperId).toBe(assignmentData.helperId);
                done();
            });

            serverSocket.emit('booking:helper-assigned', assignmentData);
        });

        test('should emit booking status update', (done) => {
            const statusData = {
                bookingId: '507f1f77bcf86cd799439011',
                status: 'in-progress'
            };

            clientSocket.on('booking:status-update', (data) => {
                expect(data.status).toBe('in-progress');
                done();
            });

            serverSocket.emit('booking:status-update', statusData);
        });
    });

    describe('Location Events', () => {
        test('should emit helper location update', (done) => {
            const locationData = mockSocketEvents.locationUpdate.data;

            clientSocket.on('helper:location-update', (data) => {
                expect(data.helperId).toBe(locationData.helperId);
                expect(data.location.coordinates).toEqual(locationData.location.coordinates);
                done();
            });

            serverSocket.emit('helper:location-update', locationData);
        });

        test('should broadcast location to specific booking room', (done) => {
            const bookingId = '507f1f77bcf86cd799439011';
            const locationData = {
                helperId: '507f1f77bcf86cd799439014',
                location: {
                    type: 'Point',
                    coordinates: [77.2095, 28.6145]
                }
            };

            // Join booking room
            serverSocket.join(`booking:${bookingId}`);

            clientSocket.on('location-update', (data) => {
                expect(data.location.coordinates).toEqual(locationData.location.coordinates);
                done();
            });

            // Broadcast to booking room
            io.to(`booking:${bookingId}`).emit('location-update', locationData);
        });
    });

    describe('Notification Events', () => {
        test('should emit notification to user', (done) => {
            const notification = {
                type: 'booking_confirmed',
                title: 'Booking Confirmed',
                message: 'Your booking has been confirmed!',
                timestamp: new Date()
            };

            clientSocket.on('notification', (data) => {
                expect(data.type).toBe('booking_confirmed');
                expect(data.title).toBe('Booking Confirmed');
                done();
            });

            serverSocket.emit('notification', notification);
        });
    });

    describe('Room Management', () => {
        test('should join multiple rooms', (done) => {
            const userId = '507f1f77bcf86cd799439011';
            const bookingId = '507f1f77bcf86cd799439012';

            serverSocket.join(`user:${userId}`);
            serverSocket.join(`booking:${bookingId}`);

            const rooms = Array.from(serverSocket.rooms);
            expect(rooms).toContain(`user:${userId}`);
            expect(rooms).toContain(`booking:${bookingId}`);
            done();
        });

        test('should leave room', (done) => {
            const roomName = 'test-room';

            serverSocket.join(roomName);
            expect(Array.from(serverSocket.rooms)).toContain(roomName);

            serverSocket.leave(roomName);
            expect(Array.from(serverSocket.rooms)).not.toContain(roomName);
            done();
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid event data', (done) => {
            serverSocket.on('error', (error) => {
                expect(error).toBeDefined();
                done();
            });

            clientSocket.emit('booking:create', { invalid: 'data' });

            // Simulate error
            serverSocket.emit('error', { message: 'Invalid data' });
        });
    });

    describe('Performance', () => {
        test('should handle multiple simultaneous events', (done) => {
            let receivedCount = 0;
            const totalEvents = 100;

            clientSocket.on('test-event', () => {
                receivedCount++;
                if (receivedCount === totalEvents) {
                    done();
                }
            });

            for (let i = 0; i < totalEvents; i++) {
                serverSocket.emit('test-event', { index: i });
            }
        });

        test('should emit events within 10ms', (done) => {
            const startTime = Date.now();

            clientSocket.on('performance-test', () => {
                const endTime = Date.now();
                const duration = endTime - startTime;
                expect(duration).toBeLessThan(10);
                done();
            });

            serverSocket.emit('performance-test', {});
        });
    });
});
