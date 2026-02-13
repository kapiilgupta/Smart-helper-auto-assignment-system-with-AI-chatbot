const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/', verifyToken, reviewController.createReview);
router.get('/flagged', verifyToken, authorize('admin'), reviewController.getFlaggedReviews);
router.get('/booking/:bookingId', verifyToken, reviewController.getBookingReviews);
router.get('/:userId', reviewController.getReviews); // Public - no auth required
router.get('/:userId/stats', reviewController.getRatingStats); // Public - no auth required
router.put('/:reviewId', verifyToken, reviewController.updateReview);
router.delete('/:reviewId', verifyToken, reviewController.deleteReview);
router.post('/:reviewId/flag', verifyToken, reviewController.flagReview);
router.post('/:reviewId/moderate', verifyToken, authorize('admin'), reviewController.moderateReview);
router.post('/:reviewId/helpful', verifyToken, reviewController.markHelpful);
router.post('/:reviewId/response', verifyToken, reviewController.addResponse);

module.exports = router;
