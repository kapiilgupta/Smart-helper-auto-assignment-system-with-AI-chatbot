const paymentService = require('../services/paymentService');
const { getAvailableGateways, paymentConfig } = require('../config/payment');

/**
 * Create payment order
 * POST /api/payments/create-order
 */
exports.createOrder = async (req, res) => {
    try {
        const { bookingId, amount, gateway = 'razorpay' } = req.body;

        if (!bookingId || !amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'bookingId and amount are required'
            });
        }

        let order;

        if (gateway === 'razorpay') {
            order = await paymentService.createRazorpayOrder(amount, bookingId, req.user._id);
        } else if (gateway === 'stripe') {
            order = await paymentService.createStripePaymentIntent(amount, bookingId, req.user._id);
        } else {
            return res.status(400).json({
                error: 'Invalid gateway',
                message: 'Supported gateways: razorpay, stripe'
            });
        }

        res.status(200).json({
            success: true,
            order,
            gateway
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            error: 'Payment order creation failed',
            message: error.message
        });
    }
};

/**
 * Verify payment
 * POST /api/payments/verify
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, signature, bookingId, gateway = 'razorpay' } = req.body;

        if (!orderId || !paymentId || !bookingId) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'orderId, paymentId, and bookingId are required'
            });
        }

        let result;

        if (gateway === 'razorpay') {
            // Verify Razorpay payment
            const verification = await paymentService.verifyRazorpayPayment(orderId, paymentId, signature);

            if (!verification.verified) {
                return res.status(400).json({
                    error: 'Payment verification failed',
                    message: 'Invalid payment signature'
                });
            }

            // Process booking payment
            result = await paymentService.processBookingPayment(bookingId, {
                gateway: 'razorpay',
                orderId,
                paymentId,
                signature
            });
        } else if (gateway === 'stripe') {
            // For Stripe, payment is already verified by webhook
            result = await paymentService.processBookingPayment(bookingId, {
                gateway: 'stripe',
                orderId,
                paymentId,
                signature: 'stripe_verified'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            transaction: result.transaction,
            booking: result.booking
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            error: 'Payment verification failed',
            message: error.message
        });
    }
};

/**
 * Get available payment methods
 * GET /api/payments/methods
 */
exports.getPaymentMethods = async (req, res) => {
    try {
        const gateways = getAvailableGateways();

        res.status(200).json({
            success: true,
            methods: gateways,
            config: {
                currency: paymentConfig.currency,
                platformFee: paymentConfig.platformFeePercentage
            }
        });
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({
            error: 'Failed to fetch payment methods',
            message: error.message
        });
    }
};

/**
 * Process refund
 * POST /api/payments/refund/:bookingId
 */
exports.processRefund = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason = 'Booking cancelled' } = req.body;

        const result = await paymentService.processRefund(bookingId, reason);

        res.status(200).json({
            success: true,
            message: 'Refund processed successfully',
            refund: result.refund,
            transaction: result.refundTransaction,
            booking: result.booking
        });
    } catch (error) {
        console.error('Process refund error:', error);
        res.status(500).json({
            error: 'Refund processing failed',
            message: error.message
        });
    }
};

/**
 * Razorpay webhook handler
 * POST /api/payments/webhook/razorpay
 */
exports.razorpayWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];

        // Verify webhook signature
        const { verifyRazorpayWebhook } = require('../config/payment');
        const isValid = verifyRazorpayWebhook(req.body, signature);

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const event = req.body.event;
        const payload = req.body.payload.payment.entity;

        // Handle different events
        switch (event) {
            case 'payment.captured':
                // Payment successful
                console.log('Payment captured:', payload.id);
                break;
            case 'payment.failed':
                // Payment failed
                console.log('Payment failed:', payload.id);
                break;
            case 'refund.created':
                // Refund created
                console.log('Refund created:', payload.id);
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Razorpay webhook error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Stripe webhook handler
 * POST /api/payments/webhook/stripe
 */
exports.stripeWebhook = async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];

        const { verifyStripeWebhook } = require('../config/payment');
        const event = verifyStripeWebhook(req.body, signature);

        // Handle different events
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('Payment succeeded:', event.data.object.id);
                break;
            case 'payment_intent.payment_failed':
                console.log('Payment failed:', event.data.object.id);
                break;
            case 'charge.refunded':
                console.log('Refund processed:', event.data.object.id);
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(400).json({ error: error.message });
    }
};

/**
 * Pay with wallet
 * POST /api/payments/wallet-pay
 */
exports.payWithWallet = async (req, res) => {
    try {
        const { bookingId, amount } = req.body;

        if (!bookingId || !amount) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'bookingId and amount are required'
            });
        }

        const result = await paymentService.processWalletPayment(req.user._id, bookingId, amount);

        res.status(200).json({
            success: true,
            message: 'Payment successful',
            transaction: result.transaction,
            booking: result.booking
        });
    } catch (error) {
        console.error('Wallet payment error:', error);
        res.status(500).json({
            error: 'Wallet payment failed',
            message: error.message
        });
    }
};

module.exports = exports;
