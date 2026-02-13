const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication except webhooks
router.post('/create-order', verifyToken, paymentController.createOrder);
router.post('/verify', verifyToken, paymentController.verifyPayment);
router.get('/methods', verifyToken, paymentController.getPaymentMethods);
router.post('/refund/:bookingId', verifyToken, paymentController.processRefund);
router.post('/wallet-pay', verifyToken, paymentController.payWithWallet);

// Webhook routes (no authentication, verified by signature)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), paymentController.razorpayWebhook);
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

module.exports = router;
