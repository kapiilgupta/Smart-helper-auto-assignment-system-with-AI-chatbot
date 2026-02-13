/**
 * Geospatial Queries Performance Tests
 * Tests for MongoDB geospatial queries and performance
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const { calculateDistance, isWithinRadius, getBoundingBox } = require('../utils/geoUtils');
const { testLocations, sampleHelpers } = require('./testData');

describe('Geospatial Queries', () => {
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
        await User.insertMany(sampleHelpers);
    });

    describe('$near Query', () => {
        test('should find helpers near user location', async () => {
            const userLocation = testLocations.delhi;

            const helpers = await User.find({
                role: 'helper',
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [userLocation.longitude, userLocation.latitude]
                        },
                        $maxDistance: 10000 // 10 km in meters
                    }
                }
            });

            expect(helpers.length).toBeGreaterThan(0);

            // Verify all helpers are within 10km
            helpers.forEach(helper => {
                const [lng, lat] = helper.location.coordinates;
                const distance = calculateDistance(
                    userLocation,
                    { latitude: lat, longitude: lng }
                );
                expect(distance).toBeLessThanOrEqual(10);
            });
        });

        test('should return helpers sorted by distance', async () => {
            const userLocation = testLocations.delhi;

            const helpers = await User.find({
                role: 'helper',
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [userLocation.longitude, userLocation.latitude]
                        }
                    }
                }
            }).limit(3);

            // Calculate distances
            const distances = helpers.map(helper => {
                const [lng, lat] = helper.location.coordinates;
                return calculateDistance(
                    userLocation,
                    { latitude: lat, longitude: lng }
                );
            });

            // Verify sorted order
            for (let i = 1; i < distances.length; i++) {
                expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
            }
        });
    });

    describe('$geoWithin Query', () => {
        test('should find helpers within bounding box', async () => {
            const center = testLocations.delhi;
            const box = getBoundingBox(center, 10);

            const helpers = await User.find({
                role: 'helper',
                location: {
                    $geoWithin: {
                        $box: [
                            [box.minLng, box.minLat],
                            [box.maxLng, box.maxLat]
                        ]
                    }
                }
            });

            expect(helpers.length).toBeGreaterThan(0);
        });

        test('should find helpers within circular area', async () => {
            const center = testLocations.delhi;
            const radiusInRadians = 10 / 6371; // 10 km / Earth radius

            const helpers = await User.find({
                role: 'helper',
                location: {
                    $geoWithin: {
                        $centerSphere: [
                            [center.longitude, center.latitude],
                            radiusInRadians
                        ]
                    }
                }
            });

            expect(helpers.length).toBeGreaterThan(0);
        });
    });

    describe('Query Performance', () => {
        test('should execute geospatial query within 100ms', async () => {
            const userLocation = testLocations.delhi;

            const startTime = Date.now();

            await User.find({
                role: 'helper',
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [userLocation.longitude, userLocation.latitude]
                        },
                        $maxDistance: 10000
                    }
                }
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(100);
        });

        test('should handle large dataset efficiently', async () => {
            // Create 1000 helpers
            const manyHelpers = Array.from({ length: 1000 }, (_, i) => ({
                name: `Helper ${i}`,
                email: `helper${i}@test.com`,
                password: 'test123',
                phone: `+91${i.toString().padStart(10, '0')}`,
                role: 'helper',
                skills: ['plumbing'],
                availability: true,
                location: {
                    type: 'Point',
                    coordinates: [
                        77.2090 + (Math.random() - 0.5) * 0.1,
                        28.6139 + (Math.random() - 0.5) * 0.1
                    ]
                }
            }));

            await User.insertMany(manyHelpers);

            const userLocation = testLocations.delhi;
            const startTime = Date.now();

            const helpers = await User.find({
                role: 'helper',
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [userLocation.longitude, userLocation.latitude]
                        },
                        $maxDistance: 10000
                    }
                }
            }).limit(10);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(helpers.length).toBe(10);
            expect(duration).toBeLessThan(200); // Should still be fast
        });
    });

    describe('Index Usage', () => {
        test('should use 2dsphere index for geospatial queries', async () => {
            const indexes = await User.collection.getIndexes();

            expect(indexes).toHaveProperty('location_2dsphere');
        });
    });

    describe('Combined Queries', () => {
        test('should filter by availability and location', async () => {
            const userLocation = testLocations.delhi;

            const helpers = await User.find({
                role: 'helper',
                availability: true,
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [userLocation.longitude, userLocation.latitude]
                        },
                        $maxDistance: 10000
                    }
                }
            });

            helpers.forEach(helper => {
                expect(helper.availability).toBe(true);
            });
        });

        test('should filter by skills and location', async () => {
            const userLocation = testLocations.delhi;

            const helpers = await User.find({
                role: 'helper',
                skills: 'plumbing',
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [userLocation.longitude, userLocation.latitude]
                        },
                        $maxDistance: 10000
                    }
                }
            });

            helpers.forEach(helper => {
                expect(helper.skills).toContain('plumbing');
            });
        });
    });
});
