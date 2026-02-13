const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// All routes require authentication except webhooks
router.post('/create-order', protect, paymentController.createOrder);
router.post('/verify', protect, paymentController.verifyPayment);
router.get('/methods', protect, paymentController.getPaymentMethods);
router.post('/refund/:bookingId', protect, paymentController.processRefund);
router.post('/wallet-pay', protect, paymentController.payWithWallet);

// Webhook routes (no authentication, verified by signature)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), paymentController.razorpayWebhook);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

module.exports = router;
