const Helper = require('../models/Helper');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

/**
 * Find and assign the best available helper for a booking
 * @param {String} bookingId - The booking ID
 * @param {Object} userLocation - User's location { type: 'Point', coordinates: [lng, lat] }
 * @param {String} serviceType - The service type/category
 * @returns {Object} - Assignment result with helper details
 */
const findAndAssignHelper = async (bookingId, userLocation, serviceType) => {
    try {
        console.log(`[Assignment Service] Starting assignment for booking: ${bookingId}`);
        console.log(`[Assignment Service] Service type: ${serviceType}`);
        console.log(`[Assignment Service] User location:`, userLocation);

        // Step 1: Get the service details to find required skills
        const service = await Service.findOne({ category: serviceType, isActive: true });
        if (!service) {
            throw new Error(`Service type '${serviceType}' not found or inactive`);
        }

        console.log(`[Assignment Service] Found service: ${service.name}`);

        // Step 2: Find all helpers with matching skills for the service
        // For this implementation, we'll match by category name in skills array
        const skillQuery = {
            skills: { $in: [serviceType, service.name] },
            availability: true
        };

        // Step 3: Use MongoDB geospatial query to find helpers within 10km radius
        const helpers = await Helper.find({
            ...skillQuery,
            location: {
                $near: {
                    $geometry: userLocation,
                    $maxDistance: 10000 // 10km in meters
                }
            }
        }).select('-password'); // Exclude password field

        console.log(`[Assignment Service] Found ${helpers.length} available helpers within 10km`);

        if (helpers.length === 0) {
            throw new Error('No available helpers found within 10km radius with required skills');
        }

        // Step 4: Sort by distance (already sorted by $near) and rating
        // Calculate distance for each helper and sort by rating as secondary criteria
        const helpersWithDistance = helpers.map(helper => {
            const distance = calculateDistance(
                userLocation.coordinates,
                helper.location.coordinates
            );
            return {
                ...helper.toObject(),
                distance: distance
            };
        });

        // Sort by distance first (ascending), then by rating (descending)
        helpersWithDistance.sort((a, b) => {
            if (Math.abs(a.distance - b.distance) < 0.1) { // If distance is similar (within 100m)
                return b.rating - a.rating; // Sort by rating
            }
            return a.distance - b.distance; // Sort by distance
        });

        // Step 5: Return top 3 candidates
        const topCandidates = helpersWithDistance.slice(0, 3);
        console.log(`[Assignment Service] Top 3 candidates:`, topCandidates.map(h => ({
            name: h.name,
            distance: h.distance.toFixed(2) + 'km',
            rating: h.rating
        })));

        // Step 6: Assign to the best helper (first in sorted list)
        const bestHelper = topCandidates[0];

        // Update helper status to busy and add to currentBookings
        await Helper.findByIdAndUpdate(bestHelper._id, {
            availability: false,
            $push: { currentBookings: bookingId }
        });

        console.log(`[Assignment Service] Assigned helper: ${bestHelper.name} (${bestHelper._id})`);

        // Step 7: Update booking record with assignment details
        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                helperId: bestHelper._id,
                status: 'assigned',
                price: service.basePrice,
                $push: {
                    assignmentHistory: {
                        helperId: bestHelper._id,
                        assignedAt: new Date(),
                        status: 'assigned'
                    }
                }
            },
            { new: true }
        ).populate('helperId', '-password')
            .populate('serviceId')
            .populate('userId', '-password');

        console.log(`[Assignment Service] Booking updated successfully`);

        return {
            success: true,
            booking: updatedBooking,
            assignedHelper: {
                id: bestHelper._id,
                name: bestHelper.name,
                phone: bestHelper.phone,
                rating: bestHelper.rating,
                distance: bestHelper.distance,
                skills: bestHelper.skills
            },
            alternateHelpers: topCandidates.slice(1).map(h => ({
                id: h._id,
                name: h.name,
                rating: h.rating,
                distance: h.distance
            }))
        };

    } catch (error) {
        console.error(`[Assignment Service] Error:`, error.message);

        // If assignment fails, log it in the booking
        if (bookingId) {
            await Booking.findByIdAndUpdate(bookingId, {
                $inc: { rejectionCount: 1 }
            });
        }

        throw error;
    }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coords1 - [longitude, latitude]
 * @param {Array} coords2 - [longitude, latitude]
 * @returns {Number} - Distance in kilometers
 */
const calculateDistance = (coords1, coords2) => {
    const [lon1, lat1] = coords1;
    const [lon2, lat2] = coords2;

    const R = 6371; // Earth's radius in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * Reassign booking to next available helper (in case of rejection)
 * @param {String} bookingId - The booking ID
 * @returns {Object} - Reassignment result
 */
const reassignHelper = async (bookingId) => {
    try {
        console.log(`[Assignment Service] Reassigning booking: ${bookingId}`);

        const booking = await Booking.findById(bookingId).populate('serviceId');
        if (!booking) {
            throw new Error('Booking not found');
        }

        // Get previously assigned helper IDs to exclude them
        const previousHelperIds = booking.assignmentHistory.map(h => h.helperId);

        // Find new helpers excluding previous ones
        const helpers = await Helper.find({
            _id: { $nin: previousHelperIds },
            skills: { $in: [booking.serviceId.category, booking.serviceId.name] },
            availability: true,
            location: {
                $near: {
                    $geometry: booking.location,
                    $maxDistance: 10000
                }
            }
        }).select('-password');

        if (helpers.length === 0) {
            throw new Error('No alternate helpers available for reassignment');
        }

        // Assign to the first available helper
        const newHelper = helpers[0];

        await Helper.findByIdAndUpdate(newHelper._id, {
            availability: false,
            $push: { currentBookings: bookingId }
        });

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                helperId: newHelper._id,
                status: 'assigned',
                $push: {
                    assignmentHistory: {
                        helperId: newHelper._id,
                        assignedAt: new Date(),
                        status: 'assigned'
                    }
                }
            },
            { new: true }
        ).populate('helperId', '-password');

        console.log(`[Assignment Service] Reassigned to helper: ${newHelper.name}`);

        return {
            success: true,
            booking: updatedBooking,
            assignedHelper: newHelper
        };

    } catch (error) {
        console.error(`[Assignment Service] Reassignment error:`, error.message);
        throw error;
    }
};

module.exports = {
    findAndAssignHelper,
    reassignHelper,
    calculateDistance
};
