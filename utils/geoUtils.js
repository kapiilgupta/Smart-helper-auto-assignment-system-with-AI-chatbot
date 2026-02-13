/**
 * Geofencing and Distance Calculation Utilities
 * Provides functions for location-based operations
 */

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {Object} point1 - First point {latitude, longitude}
 * @param {Object} point2 - Second point {latitude, longitude}
 * @returns {number} Distance in kilometers
 */
function calculateDistance(point1, point2) {
    // Validate inputs
    if (!point1 || !point2) {
        throw new Error('Both points are required');
    }

    const { latitude: lat1, longitude: lon1 } = point1;
    const { latitude: lat2, longitude: lon2 } = point2;

    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
        throw new Error('Invalid coordinates');
    }

    // Earth's radius in kilometers
    const R = 6371;

    // Convert degrees to radians
    const toRad = (deg) => deg * (Math.PI / 180);

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return parseFloat(distance.toFixed(2));
}

/**
 * Check if helper location is within specified radius of user location
 * @param {Object} helperLocation - Helper's location {latitude, longitude}
 * @param {Object} userLocation - User's location {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {boolean} True if within radius
 */
function isWithinRadius(helperLocation, userLocation, radiusKm = 10) {
    if (!helperLocation || !userLocation) {
        return false;
    }

    if (radiusKm <= 0) {
        throw new Error('Radius must be positive');
    }

    const distance = calculateDistance(helperLocation, userLocation);
    return distance <= radiusKm;
}

/**
 * Estimate arrival time based on distance and travel mode
 * @param {number} distance - Distance in kilometers
 * @param {string} travelMode - Travel mode: 'walking', 'bike', 'car', 'auto'
 * @returns {number} Estimated time in minutes
 */
function estimateArrivalTime(distance, travelMode = 'bike') {
    if (distance < 0) {
        throw new Error('Distance must be non-negative');
    }

    // Average speeds in km/h
    const speeds = {
        walking: 5,      // 5 km/h
        bike: 15,        // 15 km/h
        auto: 25,        // 25 km/h (rickshaw)
        car: 30,         // 30 km/h (city traffic)
        scooter: 20      // 20 km/h
    };

    const speed = speeds[travelMode] || speeds.bike;

    // Time in hours, converted to minutes
    const timeInMinutes = (distance / speed) * 60;

    // Add buffer time (10% for traffic/delays)
    const bufferTime = timeInMinutes * 0.1;

    return Math.ceil(timeInMinutes + bufferTime);
}

/**
 * Sort helpers by distance and rating
 * @param {Array} helpers - Array of helper objects with location and rating
 * @param {Object} userLocation - User's location {latitude, longitude}
 * @returns {Array} Sorted array of helpers with distance
 */
function sortByDistanceAndRating(helpers, userLocation) {
    if (!Array.isArray(helpers)) {
        throw new Error('Helpers must be an array');
    }

    if (!userLocation) {
        throw new Error('User location is required');
    }

    // Calculate distance for each helper and add to object
    const helpersWithDistance = helpers.map(helper => {
        let distance = Infinity;

        if (helper.location && helper.location.coordinates) {
            const [lon, lat] = helper.location.coordinates;
            distance = calculateDistance(
                { latitude: lat, longitude: lon },
                userLocation
            );
        }

        return {
            ...helper,
            distance
        };
    });

    // Sort by distance first, then by rating
    const sorted = helpersWithDistance.sort((a, b) => {
        // If distances are similar (within 0.5 km), prioritize rating
        const distanceDiff = Math.abs(a.distance - b.distance);

        if (distanceDiff < 0.5) {
            // Sort by rating (descending)
            return (b.rating || 0) - (a.rating || 0);
        }

        // Otherwise sort by distance (ascending)
        return a.distance - b.distance;
    });

    return sorted;
}

/**
 * Get helpers within radius sorted by distance and rating
 * @param {Array} helpers - Array of helper objects
 * @param {Object} userLocation - User's location
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Array} Filtered and sorted helpers
 */
function getHelpersInRadius(helpers, userLocation, radiusKm = 10) {
    if (!Array.isArray(helpers)) {
        throw new Error('Helpers must be an array');
    }

    // Filter helpers within radius
    const helpersInRadius = helpers.filter(helper => {
        if (!helper.location || !helper.location.coordinates) {
            return false;
        }

        const [lon, lat] = helper.location.coordinates;
        return isWithinRadius(
            { latitude: lat, longitude: lon },
            userLocation,
            radiusKm
        );
    });

    // Sort by distance and rating
    return sortByDistanceAndRating(helpersInRadius, userLocation);
}

/**
 * Convert coordinates from GeoJSON format to lat/lng object
 * @param {Array} coordinates - GeoJSON coordinates [longitude, latitude]
 * @returns {Object} {latitude, longitude}
 */
function geoJsonToLatLng(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        throw new Error('Invalid GeoJSON coordinates');
    }

    return {
        longitude: coordinates[0],
        latitude: coordinates[1]
    };
}

/**
 * Convert lat/lng object to GeoJSON coordinates
 * @param {Object} location - {latitude, longitude}
 * @returns {Array} GeoJSON coordinates [longitude, latitude]
 */
function latLngToGeoJson(location) {
    if (!location || location.latitude == null || location.longitude == null) {
        throw new Error('Invalid location object');
    }

    return [location.longitude, location.latitude];
}

/**
 * Calculate bounding box for a given point and radius
 * @param {Object} center - Center point {latitude, longitude}
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Object} Bounding box {minLat, maxLat, minLng, maxLng}
 */
function getBoundingBox(center, radiusKm) {
    if (!center || center.latitude == null || center.longitude == null) {
        throw new Error('Invalid center point');
    }

    if (radiusKm <= 0) {
        throw new Error('Radius must be positive');
    }

    // Earth's radius in kilometers
    const R = 6371;

    // Convert to radians
    const lat = center.latitude * (Math.PI / 180);
    const lng = center.longitude * (Math.PI / 180);

    // Angular distance
    const angularDistance = radiusKm / R;

    // Calculate bounds
    const minLat = (lat - angularDistance) * (180 / Math.PI);
    const maxLat = (lat + angularDistance) * (180 / Math.PI);

    const minLng = (lng - angularDistance / Math.cos(lat)) * (180 / Math.PI);
    const maxLng = (lng + angularDistance / Math.cos(lat)) * (180 / Math.PI);

    return {
        minLat,
        maxLat,
        minLng,
        maxLng
    };
}

module.exports = {
    calculateDistance,
    isWithinRadius,
    estimateArrivalTime,
    sortByDistanceAndRating,
    getHelpersInRadius,
    geoJsonToLatLng,
    latLngToGeoJson,
    getBoundingBox
};
