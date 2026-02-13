const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.post('/', protect, reviewController.createReview);
router.get('/flagged', protect, authorize('admin'), reviewController.getFlaggedReviews);
router.get('/booking/:bookingId', protect, reviewController.getBookingReviews);
router.get('/:userId', reviewController.getReviews); // Public - no auth required
router.get('/:userId/stats', reviewController.getRatingStats); // Public - no auth required
router.put('/:reviewId', protect, reviewController.updateReview);
router.delete('/:reviewId', protect, reviewController.deleteReview);
router.post('/:reviewId/flag', protect, reviewController.flagReview);
router.post('/:reviewId/moderate', protect, authorize('admin'), reviewController.moderateReview);
router.post('/:reviewId/helpful', protect, reviewController.markHelpful);
router.post('/:reviewId/response', protect, reviewController.addResponse);

module.exports = router;
