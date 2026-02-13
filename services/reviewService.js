const Review = require('../models/Review');
const User = require('../models/User');
const Booking = require('../models/Booking');

// Profanity word list (basic - can be expanded)
const profanityList = ['badword1', 'badword2', 'offensive']; // Add actual words

/**
 * Check for profanity in text
 */
const checkProfanity = (text) => {
    if (!text) return false;

    const lowerText = text.toLowerCase();
    return profanityList.some(word => lowerText.includes(word));
};

/**
 * Create a new review
 */
const createReview = async (reviewData) => {
    const { reviewerId, revieweeId, bookingId, rating, comment, type } = reviewData;

    // Check if user can review
    const canReview = await Review.canReview(reviewerId, bookingId);
    if (!canReview.allowed) {
        throw new Error(canReview.reason);
    }

    // Verify booking participants
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }

    // Validate reviewer and reviewee based on type
    if (type === 'user_to_helper') {
        if (booking.userId.toString() !== reviewerId.toString()) {
            throw new Error('Only the booking user can review the helper');
        }
        if (booking.helperId.toString() !== revieweeId.toString()) {
            throw new Error('Invalid helper ID');
        }
    } else if (type === 'helper_to_user') {
        if (booking.helperId.toString() !== reviewerId.toString()) {
            throw new Error('Only the assigned helper can review the user');
        }
        if (booking.userId.toString() !== revieweeId.toString()) {
            throw new Error('Invalid user ID');
        }
    }

    // Check for profanity
    const hasProfanity = checkProfanity(comment);

    // Create review
    const review = await Review.create({
        reviewerId,
        revieweeId,
        bookingId,
        type,
        rating,
        comment,
        status: hasProfanity ? 'flagged' : 'approved',
        moderationFlags: {
            hasProfanity
        }
    });

    // Update average rating if approved
    if (!hasProfanity) {
        await updateAverageRating(revieweeId);
    }

    return review;
};

/**
 * Update user/helper average rating
 */
const updateAverageRating = async (userId) => {
    const ratingData = await Review.getAverageRating(userId);

    await User.findByIdAndUpdate(userId, {
        'rating.average': ratingData.averageRating,
        'rating.total': ratingData.totalReviews,
        'rating.breakdown': ratingData.ratingBreakdown,
        'rating.categories': ratingData.categoryRatings
    });

    return ratingData;
};

/**
 * Get reviews for a user/helper
 */
const getReviews = async (revieweeId, options = {}) => {
    const { limit = 20, page = 1, status = 'approved', sort = '-createdAt' } = options;

    const reviews = await Review.getReviews(revieweeId, { limit, page, status, sort });
    const total = await Review.countDocuments({ revieweeId, status });

    return {
        reviews,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get reviews for a specific booking
 */
const getBookingReviews = async (bookingId) => {
    const reviews = await Review.find({ bookingId, status: 'approved' })
        .populate('reviewerId', 'name profilePicture')
        .populate('revieweeId', 'name profilePicture');

    return reviews;
};

/**
 * Update a review
 */
const updateReview = async (reviewId, userId, updateData) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        throw new Error('Review not found');
    }

    // Only reviewer can update
    if (review.reviewerId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to update this review');
    }

    // Update allowed fields
    if (updateData.rating) review.rating = updateData.rating;
    if (updateData.comment !== undefined) {
        review.comment = updateData.comment;

        // Re-check profanity
        const hasProfanity = checkProfanity(updateData.comment);
        review.moderationFlags.hasProfanity = hasProfanity;
        review.status = hasProfanity ? 'flagged' : 'approved';
    }

    await review.save();

    // Update average rating
    await updateAverageRating(review.revieweeId);

    return review;
};

/**
 * Delete a review
 */
const deleteReview = async (reviewId, userId) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        throw new Error('Review not found');
    }

    // Only reviewer can delete
    if (review.reviewerId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to delete this review');
    }

    const revieweeId = review.revieweeId;

    await review.deleteOne();

    // Update average rating
    await updateAverageRating(revieweeId);

    return { message: 'Review deleted successfully' };
};

/**
 * Flag a review for moderation
 */
const flagReview = async (reviewId, reason, flaggedBy) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        throw new Error('Review not found');
    }

    await review.flag(reason, flaggedBy);

    return review;
};

/**
 * Moderate a review (admin only)
 */
const moderateReview = async (reviewId, status, moderatedBy) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        throw new Error('Review not found');
    }

    await review.moderate(status, moderatedBy);

    // Update average rating if approved
    if (status === 'approved') {
        await updateAverageRating(review.revieweeId);
    }

    return review;
};

/**
 * Mark review as helpful
 */
const markHelpful = async (reviewId, userId) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        throw new Error('Review not found');
    }

    await review.markHelpful(userId);

    return review;
};

/**
 * Add response to review (reviewee only)
 */
const addResponse = async (reviewId, userId, comment) => {
    const review = await Review.findById(reviewId);

    if (!review) {
        throw new Error('Review not found');
    }

    // Only reviewee can respond
    if (review.revieweeId.toString() !== userId.toString()) {
        throw new Error('Unauthorized to respond to this review');
    }

    await review.addResponse(comment);

    return review;
};

/**
 * Get rating statistics
 */
const getRatingStats = async (userId) => {
    const ratingData = await Review.getAverageRating(userId);

    return ratingData;
};

/**
 * Get flagged reviews (admin)
 */
const getFlaggedReviews = async (options = {}) => {
    const { limit = 20, page = 1 } = options;

    const reviews = await Review.find({ status: 'flagged' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('reviewerId', 'name email')
        .populate('revieweeId', 'name email')
        .populate('moderationFlags.flaggedBy', 'name');

    const total = await Review.countDocuments({ status: 'flagged' });

    return {
        reviews,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit)
        }
    };
};

module.exports = {
    createReview,
    updateAverageRating,
    getReviews,
    getBookingReviews,
    updateReview,
    deleteReview,
    flagReview,
    moderateReview,
    markHelpful,
    addResponse,
    getRatingStats,
    getFlaggedReviews,
    checkProfanity
};
