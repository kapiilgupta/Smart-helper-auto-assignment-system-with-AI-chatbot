const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    helperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['booking_payment', 'wallet_credit', 'wallet_debit', 'refund', 'helper_payout', 'platform_fee'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
        index: true
    },
    paymentGateway: {
        type: String,
        enum: ['razorpay', 'stripe', 'cash', 'wallet'],
        required: true
    },
    gatewayTransactionId: {
        type: String,
        unique: true,
        sparse: true
    },
    gatewayOrderId: {
        type: String
    },
    gatewayPaymentId: {
        type: String
    },
    gatewaySignature: {
        type: String
    },
    refundId: {
        type: String
    },
    metadata: {
        platformFee: Number,
        helperEarnings: Number,
        description: String,
        failureReason: String,
        refundReason: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ helperId: 1, type: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
    return `₹${this.amount.toFixed(2)}`;
});

// Method to mark transaction as completed
transactionSchema.methods.markCompleted = async function (gatewayData = {}) {
    this.status = 'completed';
    if (gatewayData.paymentId) this.gatewayPaymentId = gatewayData.paymentId;
    if (gatewayData.signature) this.gatewaySignature = gatewayData.signature;
    return this.save();
};

// Method to mark transaction as failed
transactionSchema.methods.markFailed = async function (reason) {
    this.status = 'failed';
    this.metadata.failureReason = reason;
    return this.save();
};

// Static method to get user transaction history
transactionSchema.statics.getUserTransactions = function (userId, options = {}) {
    const { limit = 20, page = 1, type, status } = options;
    const query = { userId };

    if (type) query.type = type;
    if (status) query.status = status;

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('bookingId', 'status scheduledTime')
        .populate('helperId', 'name');
};

// Static method to get helper earnings
transactionSchema.statics.getHelperEarnings = function (helperId, period = 'all') {
    const query = {
        helperId,
        type: 'wallet_credit',
        status: 'completed'
    };

    // Add date filter based on period
    if (period !== 'all') {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
        }

        if (startDate) {
            query.createdAt = { $gte: startDate };
        }
    }

    return this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalEarnings: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);
};

module.exports = mongoose.model('Transaction', transactionSchema);
