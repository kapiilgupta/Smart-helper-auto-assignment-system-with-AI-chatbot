const reviewService = require('../services/reviewService');

/**
 * Create a review
 * POST /api/reviews
 */
exports.createReview = async (req, res, next) => {
    try {
        const { revieweeId, bookingId, rating, comment, type } = req.body;

        if (!revieweeId || !bookingId || !rating || !type) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'revieweeId, bookingId, rating, and type are required'
            });
        }

        const review = await reviewService.createReview({
            reviewerId: req.user._id,
            revieweeId,
            bookingId,
            rating,
            comment,
            type
        });

        res.status(201).json({
            success: true,
            message: 'Review created successfully',
            review
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({
            error: 'Failed to create review',
            message: error.message
        });
    }
};

/**
 * Get reviews for a user/helper
 * GET /api/reviews/:userId
 */
exports.getReviews = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { limit = 20, page = 1, status = 'approved', sort = '-createdAt' } = req.query;

        const result = await reviewService.getReviews(userId, {
            limit: parseInt(limit),
            page: parseInt(page),
            status,
            sort
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            error: 'Failed to fetch reviews',
            message: error.message
        });
    }
};

/**
 * Get reviews for a booking
 * GET /api/reviews/booking/:bookingId
 */
exports.getBookingReviews = async (req, res, next) => {
    try {
        const { bookingId } = req.params;

        const reviews = await reviewService.getBookingReviews(bookingId);

        res.status(200).json({
            success: true,
            reviews
        });
    } catch (error) {
        console.error('Get booking reviews error:', error);
        res.status(500).json({
            error: 'Failed to fetch booking reviews',
            message: error.message
        });
    }
};

/**
 * Update a review
 * PUT /api/reviews/:reviewId
 */
exports.updateReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;

        const review = await reviewService.updateReview(reviewId, req.user._id, {
            rating,
            comment
        });

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            review
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            error: 'Failed to update review',
            message: error.message
        });
    }
};

/**
 * Delete a review
 * DELETE /api/reviews/:reviewId
 */
exports.deleteReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;

        const result = await reviewService.deleteReview(reviewId, req.user._id);

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            error: 'Failed to delete review',
            message: error.message
        });
    }
};

/**
 * Flag a review
 * POST /api/reviews/:reviewId/flag
 */
exports.flagReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Reason is required'
            });
        }

        const review = await reviewService.flagReview(reviewId, reason, req.user._id);

        res.status(200).json({
            success: true,
            message: 'Review flagged for moderation',
            review
        });
    } catch (error) {
        console.error('Flag review error:', error);
        res.status(500).json({
            error: 'Failed to flag review',
            message: error.message
        });
    }
};

/**
 * Moderate a review (admin only)
 * POST /api/reviews/:reviewId/moderate
 */
exports.moderateReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be approved or rejected'
            });
        }

        const review = await reviewService.moderateReview(reviewId, status, req.user._id);

        res.status(200).json({
            success: true,
            message: `Review ${status}`,
            review
        });
    } catch (error) {
        console.error('Moderate review error:', error);
        res.status(500).json({
            error: 'Failed to moderate review',
            message: error.message
        });
    }
};

/**
 * Mark review as helpful
 * POST /api/reviews/:reviewId/helpful
 */
exports.markHelpful = async (req, res, next) => {
    try {
        const { reviewId } = req.params;

        const review = await reviewService.markHelpful(reviewId, req.user._id);

        res.status(200).json({
            success: true,
            message: 'Review marked as helpful',
            review
        });
    } catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({
            error: 'Failed to mark review as helpful',
            message: error.message
        });
    }
};

/**
 * Add response to review
 * POST /api/reviews/:reviewId/response
 */
exports.addResponse = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const { comment } = req.body;

        if (!comment) {
            return res.status(400).json({
                error: 'Missing required field',
                message: 'Comment is required'
            });
        }

        const review = await reviewService.addResponse(reviewId, req.user._id, comment);

        res.status(200).json({
            success: true,
            message: 'Response added successfully',
            review
        });
    } catch (error) {
        console.error('Add response error:', error);
        res.status(500).json({
            error: 'Failed to add response',
            message: error.message
        });
    }
};

/**
 * Get rating statistics
 * GET /api/reviews/:userId/stats
 */
exports.getRatingStats = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const stats = await reviewService.getRatingStats(userId);

        res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Get rating stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch rating statistics',
            message: error.message
        });
    }
};

/**
 * Get flagged reviews (admin only)
 * GET /api/reviews/flagged
 */
exports.getFlaggedReviews = async (req, res, next) => {
    try {
        const { limit = 20, page = 1 } = req.query;

        const result = await reviewService.getFlaggedReviews({
            limit: parseInt(limit),
            page: parseInt(page)
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get flagged reviews error:', error);
        res.status(500).json({
            error: 'Failed to fetch flagged reviews',
            message: error.message
        });
    }
};

module.exports = exports;
