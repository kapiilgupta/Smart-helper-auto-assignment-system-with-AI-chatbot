const { razorpay, stripe, verifyRazorpaySignature, calculatePaymentSplit, paymentConfig } = require('../config/payment');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');

/**
 * Create payment order for Razorpay
 */
const createRazorpayOrder = async (amount, bookingId, userId) => {
    if (!paymentConfig.razorpay.enabled) {
        throw new Error('Razorpay is not configured');
    }

    const options = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: paymentConfig.currency,
        receipt: `booking_${bookingId}`,
        notes: {
            bookingId: bookingId.toString(),
            userId: userId.toString()
        }
    };

    const order = await razorpay.orders.create(options);
    return order;
};

/**
 * Create payment intent for Stripe
 */
const createStripePaymentIntent = async (amount, bookingId, userId) => {
    if (!paymentConfig.stripe.enabled) {
        throw new Error('Stripe is not configured');
    }

    const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: paymentConfig.currency.toLowerCase(),
        metadata: {
            bookingId: bookingId.toString(),
            userId: userId.toString()
        }
    });

    return paymentIntent;
};

/**
 * Verify Razorpay payment
 */
const verifyRazorpayPayment = async (orderId, paymentId, signature) => {
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValid) {
        throw new Error('Invalid payment signature');
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    return {
        verified: true,
        payment
    };
};

/**
 * Process booking payment
 */
const processBookingPayment = async (bookingId, paymentData) => {
    const booking = await Booking.findById(bookingId)
        .populate('serviceId')
        .populate('helperId');

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.paymentStatus === 'paid') {
        throw new Error('Booking already paid');
    }

    // Calculate payment split
    const { amount, platformFee, helperEarnings } = calculatePaymentSplit(booking.amount);

    // Create transaction
    const transaction = await Transaction.create({
        userId: booking.userId,
        helperId: booking.helperId,
        bookingId: booking._id,
        amount,
        type: 'booking_payment',
        status: 'pending',
        paymentGateway: paymentData.gateway,
        gatewayOrderId: paymentData.orderId,
        gatewayPaymentId: paymentData.paymentId,
        gatewaySignature: paymentData.signature,
        metadata: {
            platformFee,
            helperEarnings,
            description: `Payment for ${booking.serviceId.name}`
        }
    });

    // Mark transaction as completed
    await transaction.markCompleted({
        paymentId: paymentData.paymentId,
        signature: paymentData.signature
    });

    // Update booking
    booking.paymentStatus = 'paid';
    booking.paymentMethod = paymentData.gateway;
    booking.platformFee = platformFee;
    booking.helperEarnings = helperEarnings;
    booking.transactionId = transaction._id;
    await booking.save();

    // Credit helper wallet
    if (booking.helperId) {
        await creditHelperWallet(booking.helperId, helperEarnings, booking._id, transaction._id);
    }

    return {
        transaction,
        booking
    };
};

/**
 * Credit helper wallet
 */
const creditHelperWallet = async (helperId, amount, bookingId, transactionId) => {
    // Get or create wallet
    const wallet = await Wallet.getOrCreate(helperId);

    // Credit wallet
    await wallet.credit(amount);

    // Create wallet credit transaction
    await Transaction.create({
        userId: helperId,
        helperId: helperId,
        bookingId,
        amount,
        type: 'wallet_credit',
        status: 'completed',
        paymentGateway: 'wallet',
        gatewayTransactionId: transactionId.toString(),
        metadata: {
            description: 'Earnings from booking'
        }
    });

    return wallet;
};

/**
 * Process refund for cancelled booking
 */
const processRefund = async (bookingId, reason = 'Booking cancelled') => {
    const booking = await Booking.findById(bookingId)
        .populate('transactionId');

    if (!booking) {
        throw new Error('Booking not found');
    }

    if (booking.paymentStatus !== 'paid') {
        throw new Error('Booking not paid, cannot refund');
    }

    if (booking.paymentStatus === 'refunded') {
        throw new Error('Booking already refunded');
    }

    const transaction = booking.transactionId;

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    let refund;

    // Process refund based on payment gateway
    if (booking.paymentMethod === 'razorpay') {
        refund = await razorpay.payments.refund(transaction.gatewayPaymentId, {
            amount: Math.round(booking.amount * 100),
            notes: {
                reason,
                bookingId: bookingId.toString()
            }
        });
    } else if (booking.paymentMethod === 'stripe') {
        refund = await stripe.refunds.create({
            payment_intent: transaction.gatewayPaymentId,
            amount: Math.round(booking.amount * 100),
            reason: 'requested_by_customer',
            metadata: {
                reason,
                bookingId: bookingId.toString()
            }
        });
    } else if (booking.paymentMethod === 'wallet') {
        // Refund to wallet
        const wallet = await Wallet.getOrCreate(booking.userId);
        await wallet.credit(booking.amount);

        refund = {
            id: `wallet_refund_${Date.now()}`,
            status: 'succeeded'
        };
    }

    // Create refund transaction
    const refundTransaction = await Transaction.create({
        userId: booking.userId,
        helperId: booking.helperId,
        bookingId: booking._id,
        amount: booking.amount,
        type: 'refund',
        status: 'completed',
        paymentGateway: booking.paymentMethod,
        refundId: refund.id,
        metadata: {
            refundReason: reason,
            originalTransactionId: transaction._id.toString()
        }
    });

    // Update booking
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Update original transaction
    transaction.status = 'refunded';
    transaction.refundId = refund.id;
    await transaction.save();

    // Debit helper wallet if already credited
    if (booking.helperId && booking.helperEarnings) {
        await debitHelperWallet(booking.helperId, booking.helperEarnings, booking._id, 'Booking refunded');
    }

    return {
        refund,
        refundTransaction,
        booking
    };
};

/**
 * Debit helper wallet
 */
const debitHelperWallet = async (helperId, amount, bookingId, reason) => {
    const wallet = await Wallet.findOne({ userId: helperId });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    // Debit wallet
    await wallet.debit(amount);

    // Create wallet debit transaction
    await Transaction.create({
        userId: helperId,
        helperId: helperId,
        bookingId,
        amount,
        type: 'wallet_debit',
        status: 'completed',
        paymentGateway: 'wallet',
        metadata: {
            description: reason
        }
    });

    return wallet;
};

/**
 * Process wallet payment
 */
const processWalletPayment = async (userId, bookingId, amount) => {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    if (wallet.availableBalance < amount) {
        throw new Error('Insufficient wallet balance');
    }

    // Debit wallet
    await wallet.debit(amount);

    // Process booking payment
    return processBookingPayment(bookingId, {
        gateway: 'wallet',
        orderId: `wallet_${Date.now()}`,
        paymentId: `wallet_payment_${Date.now()}`,
        signature: 'wallet_payment'
    });
};

module.exports = {
    createRazorpayOrder,
    createStripePaymentIntent,
    verifyRazorpayPayment,
    processBookingPayment,
    processRefund,
    creditHelperWallet,
    debitHelperWallet,
    processWalletPayment
};
