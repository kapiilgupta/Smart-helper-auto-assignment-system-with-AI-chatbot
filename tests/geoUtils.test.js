/**
 * Unit Tests for Geofencing Utilities
 * Run with: npm test
 */

const {
    calculateDistance,
    isWithinRadius,
    estimateArrivalTime,
    sortByDistanceAndRating,
    getHelpersInRadius,
    geoJsonToLatLng,
    latLngToGeoJson,
    getBoundingBox
} = require('../utils/geoUtils');

describe('Geofencing Utilities', () => {

    describe('calculateDistance', () => {
        test('should calculate distance between two points correctly', () => {
            // New York to Los Angeles (approx 3944 km)
            const point1 = { latitude: 40.7128, longitude: -74.0060 };
            const point2 = { latitude: 34.0522, longitude: -118.2437 };

            const distance = calculateDistance(point1, point2);
            expect(distance).toBeGreaterThan(3900);
            expect(distance).toBeLessThan(4000);
        });

        test('should return 0 for same point', () => {
            const point = { latitude: 28.6139, longitude: 77.2090 };
            const distance = calculateDistance(point, point);
            expect(distance).toBe(0);
        });

        test('should calculate short distances accurately', () => {
            // Two points in Delhi (approx 5 km apart)
            const point1 = { latitude: 28.6139, longitude: 77.2090 };
            const point2 = { latitude: 28.6517, longitude: 77.2219 };

            const distance = calculateDistance(point1, point2);
            expect(distance).toBeGreaterThan(4);
            expect(distance).toBeLessThan(6);
        });

        test('should throw error for invalid inputs', () => {
            expect(() => calculateDistance(null, null)).toThrow();
            expect(() => calculateDistance({}, {})).toThrow();
        });
    });

    describe('isWithinRadius', () => {
        test('should return true when within radius', () => {
            const helper = { latitude: 28.6139, longitude: 77.2090 };
            const user = { latitude: 28.6200, longitude: 77.2100 };

            const result = isWithinRadius(helper, user, 10);
            expect(result).toBe(true);
        });

        test('should return false when outside radius', () => {
            const helper = { latitude: 28.6139, longitude: 77.2090 };
            const user = { latitude: 29.0000, longitude: 78.0000 };

            const result = isWithinRadius(helper, user, 10);
            expect(result).toBe(false);
        });

        test('should use default radius of 10km', () => {
            const helper = { latitude: 28.6139, longitude: 77.2090 };
            const user = { latitude: 28.6200, longitude: 77.2100 };

            const result = isWithinRadius(helper, user);
            expect(result).toBe(true);
        });

        test('should return false for null locations', () => {
            const result = isWithinRadius(null, null, 10);
            expect(result).toBe(false);
        });
    });

    describe('estimateArrivalTime', () => {
        test('should estimate time for bike correctly', () => {
            const time = estimateArrivalTime(5, 'bike'); // 5 km by bike
            expect(time).toBeGreaterThan(15); // At least 15 min
            expect(time).toBeLessThan(30);    // Less than 30 min
        });

        test('should estimate time for car correctly', () => {
            const time = estimateArrivalTime(10, 'car'); // 10 km by car
            expect(time).toBeGreaterThan(15);
            expect(time).toBeLessThan(30);
        });

        test('should estimate time for walking correctly', () => {
            const time = estimateArrivalTime(2, 'walking'); // 2 km walking
            expect(time).toBeGreaterThan(20);
            expect(time).toBeLessThan(35);
        });

        test('should use bike as default mode', () => {
            const time1 = estimateArrivalTime(5);
            const time2 = estimateArrivalTime(5, 'bike');
            expect(time1).toBe(time2);
        });

        test('should throw error for negative distance', () => {
            expect(() => estimateArrivalTime(-5, 'bike')).toThrow();
        });

        test('should return 0 for zero distance', () => {
            const time = estimateArrivalTime(0, 'bike');
            expect(time).toBe(0);
        });
    });

    describe('sortByDistanceAndRating', () => {
        test('should sort by distance when ratings are similar', () => {
            const helpers = [
                {
                    id: 1,
                    rating: 4.5,
                    location: { coordinates: [77.2090, 28.6139] }
                },
                {
                    id: 2,
                    rating: 4.4,
                    location: { coordinates: [77.2100, 28.6150] }
                },
                {
                    id: 3,
                    rating: 4.6,
                    location: { coordinates: [77.2080, 28.6130] }
                }
            ];

            const userLocation = { latitude: 28.6139, longitude: 77.2090 };
            const sorted = sortByDistanceAndRating(helpers, userLocation);

            expect(sorted[0].id).toBe(1); // Closest
        });

        test('should prioritize rating when distances are similar', () => {
            const helpers = [
                {
                    id: 1,
                    rating: 3.5,
                    location: { coordinates: [77.2090, 28.6139] }
                },
                {
                    id: 2,
                    rating: 4.8,
                    location: { coordinates: [77.2091, 28.6140] }
                }
            ];

            const userLocation = { latitude: 28.6139, longitude: 77.2090 };
            const sorted = sortByDistanceAndRating(helpers, userLocation);

            expect(sorted[0].id).toBe(2); // Higher rating
        });

        test('should handle helpers without location', () => {
            const helpers = [
                { id: 1, rating: 4.5, location: null },
                { id: 2, rating: 4.0, location: { coordinates: [77.2090, 28.6139] } }
            ];

            const userLocation = { latitude: 28.6139, longitude: 77.2090 };
            const sorted = sortByDistanceAndRating(helpers, userLocation);

            expect(sorted[0].id).toBe(2); // Has location
        });

        test('should throw error for invalid inputs', () => {
            expect(() => sortByDistanceAndRating(null, {})).toThrow();
            expect(() => sortByDistanceAndRating([], null)).toThrow();
        });
    });

    describe('getHelpersInRadius', () => {
        test('should filter and sort helpers within radius', () => {
            const helpers = [
                {
                    id: 1,
                    rating: 4.5,
                    location: { coordinates: [77.2090, 28.6139] }
                },
                {
                    id: 2,
                    rating: 4.0,
                    location: { coordinates: [78.0000, 29.0000] } // Far away
                },
                {
                    id: 3,
                    rating: 4.8,
                    location: { coordinates: [77.2100, 28.6150] }
                }
            ];

            const userLocation = { latitude: 28.6139, longitude: 77.2090 };
            const result = getHelpersInRadius(helpers, userLocation, 10);

            expect(result.length).toBe(2);
            expect(result.find(h => h.id === 2)).toBeUndefined();
        });
    });

    describe('geoJsonToLatLng', () => {
        test('should convert GeoJSON to lat/lng', () => {
            const coords = [77.2090, 28.6139];
            const result = geoJsonToLatLng(coords);

            expect(result.latitude).toBe(28.6139);
            expect(result.longitude).toBe(77.2090);
        });

        test('should throw error for invalid input', () => {
            expect(() => geoJsonToLatLng(null)).toThrow();
            expect(() => geoJsonToLatLng([77.2090])).toThrow();
        });
    });

    describe('latLngToGeoJson', () => {
        test('should convert lat/lng to GeoJSON', () => {
            const location = { latitude: 28.6139, longitude: 77.2090 };
            const result = latLngToGeoJson(location);

            expect(result[0]).toBe(77.2090);
            expect(result[1]).toBe(28.6139);
        });

        test('should throw error for invalid input', () => {
            expect(() => latLngToGeoJson(null)).toThrow();
            expect(() => latLngToGeoJson({})).toThrow();
        });
    });

    describe('getBoundingBox', () => {
        test('should calculate bounding box correctly', () => {
            const center = { latitude: 28.6139, longitude: 77.2090 };
            const box = getBoundingBox(center, 10);

            expect(box.minLat).toBeLessThan(center.latitude);
            expect(box.maxLat).toBeGreaterThan(center.latitude);
            expect(box.minLng).toBeLessThan(center.longitude);
            expect(box.maxLng).toBeGreaterThan(center.longitude);
        });

        test('should throw error for invalid inputs', () => {
            expect(() => getBoundingBox(null, 10)).toThrow();
            expect(() => getBoundingBox({ latitude: 28, longitude: 77 }, -5)).toThrow();
        });
    });
});
