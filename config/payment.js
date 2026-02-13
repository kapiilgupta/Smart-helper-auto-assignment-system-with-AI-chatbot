const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    })
    : null;

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
    ? Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

// Payment gateway configuration
const paymentConfig = {
    // Default gateway
    defaultGateway: process.env.DEFAULT_PAYMENT_GATEWAY || 'razorpay',

    // Platform fee percentage
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 20,

    // Minimum withdrawal amount
    minimumWithdrawal: parseFloat(process.env.MINIMUM_WITHDRAWAL_AMOUNT) || 500,

    // Currency
    currency: process.env.CURRENCY || 'INR',

    // Razorpay configuration
    razorpay: {
        enabled: !!razorpay,
        instance: razorpay,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    },

    // Stripe configuration
    stripe: {
        enabled: !!stripe,
        instance: stripe,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }
};

/**
 * Verify Razorpay payment signature
 */
const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    if (!paymentConfig.razorpay.enabled) {
        throw new Error('Razorpay is not configured');
    }

    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(text)
        .digest('hex');

    return generatedSignature === signature;
};

/**
 * Verify Razorpay webhook signature
 */
const verifyRazorpayWebhook = (body, signature) => {
    if (!paymentConfig.razorpay.webhookSecret) {
        throw new Error('Razorpay webhook secret not configured');
    }

    const expectedSignature = crypto
        .createHmac('sha256', paymentConfig.razorpay.webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

    return expectedSignature === signature;
};

/**
 * Verify Stripe webhook signature
 */
const verifyStripeWebhook = (body, signature) => {
    if (!paymentConfig.stripe.enabled) {
        throw new Error('Stripe is not configured');
    }

    try {
        const event = stripe.webhooks.constructEvent(
            body,
            signature,
            paymentConfig.stripe.webhookSecret
        );
        return event;
    } catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
};

/**
 * Calculate platform fee and helper earnings
 */
const calculatePaymentSplit = (amount) => {
    const platformFee = (amount * paymentConfig.platformFeePercentage) / 100;
    const helperEarnings = amount - platformFee;

    return {
        amount,
        platformFee: Math.round(platformFee * 100) / 100,
        helperEarnings: Math.round(helperEarnings * 100) / 100
    };
};

/**
 * Get available payment gateways
 */
const getAvailableGateways = () => {
    const gateways = [];

    if (paymentConfig.razorpay.enabled) {
        gateways.push({
            name: 'razorpay',
            displayName: 'Razorpay',
            supported: true
        });
    }

    if (paymentConfig.stripe.enabled) {
        gateways.push({
            name: 'stripe',
            displayName: 'Stripe',
            supported: true
        });
    }

    // Cash is always available
    gateways.push({
        name: 'cash',
        displayName: 'Cash',
        supported: true
    });

    // Wallet is always available
    gateways.push({
        name: 'wallet',
        displayName: 'Wallet',
        supported: true
    });

    return gateways;
};

module.exports = {
    paymentConfig,
    razorpay,
    stripe,
    verifyRazorpaySignature,
    verifyRazorpayWebhook,
    verifyStripeWebhook,
    calculatePaymentSplit,
    getAvailableGateways
};
