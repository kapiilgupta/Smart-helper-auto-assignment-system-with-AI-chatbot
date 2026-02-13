const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { razorpay, stripe, paymentConfig } = require('../config/payment');

/**
 * Get or create wallet for user
 */
const getOrCreateWallet = async (userId) => {
    return await Wallet.getOrCreate(userId);
};

/**
 * Get wallet balance
 */
const getWalletBalance = async (userId) => {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
        return {
            balance: 0,
            availableBalance: 0,
            totalEarnings: 0,
            totalWithdrawals: 0,
            pendingAmount: 0
        };
    }

    return {
        balance: wallet.balance,
        availableBalance: wallet.availableBalance,
        totalEarnings: wallet.totalEarnings,
        totalWithdrawals: wallet.totalWithdrawals,
        pendingAmount: wallet.pendingAmount,
        bankDetails: wallet.bankDetails
    };
};

/**
 * Get transaction history
 */
const getTransactionHistory = async (userId, options = {}) => {
    const { limit = 20, page = 1, type, status } = options;

    const query = {
        $or: [
            { userId },
            { helperId: userId }
        ]
    };

    if (type) query.type = type;
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('bookingId', 'status scheduledTime')
        .populate('userId', 'name email')
        .populate('helperId', 'name email');

    const total = await Transaction.countDocuments(query);

    return {
        transactions,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Process withdrawal request
 */
const processWithdrawal = async (userId, amount) => {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
        throw new Error('Wallet not found');
    }

    // Check if withdrawal is allowed
    const canWithdraw = wallet.canWithdraw(amount);

    if (!canWithdraw.allowed) {
        throw new Error(canWithdraw.reason);
    }

    // Debit wallet
    await wallet.debit(amount);

    // Create withdrawal transaction
    const transaction = await Transaction.create({
        userId,
        helperId: userId,
        amount,
        type: 'helper_payout',
        status: 'pending',
        paymentGateway: 'bank_transfer',
        metadata: {
            description: 'Withdrawal to bank account',
            bankDetails: {
                accountNumber: wallet.bankDetails.accountNumber,
                ifscCode: wallet.bankDetails.ifscCode,
                accountHolderName: wallet.bankDetails.accountHolderName
            }
        }
    });

    // TODO: Integrate with actual payout API (Razorpay Payouts or Stripe Payouts)
    // For now, mark as completed
    await transaction.markCompleted();

    return {
        transaction,
        wallet
    };
};

/**
 * Add bank details
 */
const addBankDetails = async (userId, bankDetails) => {
    const wallet = await getOrCreateWallet(userId);

    wallet.bankDetails = {
        accountNumber: bankDetails.accountNumber,
        ifscCode: bankDetails.ifscCode,
        accountHolderName: bankDetails.accountHolderName,
        bankName: bankDetails.bankName,
        verified: false // Will be verified by admin or payment gateway
    };

    await wallet.save();

    return wallet;
};

/**
 * Verify bank details
 */
const verifyBankDetails = async (userId) => {
    const wallet = await Wallet.findOne({ userId });

    if (!wallet || !wallet.bankDetails) {
        throw new Error('Bank details not found');
    }

    // TODO: Integrate with bank verification API
    // For now, mark as verified
    wallet.bankDetails.verified = true;
    await wallet.save();

    return wallet;
};

/**
 * Get withdrawal history
 */
const getWithdrawalHistory = async (userId, options = {}) => {
    const { limit = 20, page = 1 } = options;

    const query = {
        userId,
        type: 'helper_payout'
    };

    const withdrawals = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    return {
        withdrawals,
        pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get earnings summary
 */
const getEarningsSummary = async (userId) => {
    const today = await Transaction.getHelperEarnings(userId, 'today');
    const week = await Transaction.getHelperEarnings(userId, 'week');
    const month = await Transaction.getHelperEarnings(userId, 'month');
    const all = await Transaction.getHelperEarnings(userId, 'all');

    return {
        today: today[0] || { totalEarnings: 0, count: 0 },
        week: week[0] || { totalEarnings: 0, count: 0 },
        month: month[0] || { totalEarnings: 0, count: 0 },
        all: all[0] || { totalEarnings: 0, count: 0 }
    };
};

module.exports = {
    getOrCreateWallet,
    getWalletBalance,
    getTransactionHistory,
    processWithdrawal,
    addBankDetails,
    verifyBankDetails,
    getWithdrawalHistory,
    getEarningsSummary
};
