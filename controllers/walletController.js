const walletService = require('../services/walletService');

/**
 * Get wallet balance
 * GET /api/wallet
 */
exports.getWallet = async (req, res) => {
    try {
        const wallet = await walletService.getWalletBalance(req.user._id);

        res.status(200).json({
            success: true,
            wallet
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            error: 'Failed to fetch wallet',
            message: error.message
        });
    }
};

/**
 * Get transaction history
 * GET /api/wallet/transactions
 */
exports.getTransactions = async (req, res) => {
    try {
        const { limit = 20, page = 1, type, status } = req.query;

        const result = await walletService.getTransactionHistory(req.user._id, {
            limit: parseInt(limit),
            page: parseInt(page),
            type,
            status
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            error: 'Failed to fetch transactions',
            message: error.message
        });
    }
};

/**
 * Request withdrawal
 * POST /api/wallet/withdraw
 */
exports.requestWithdrawal = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount',
                message: 'Amount must be greater than 0'
            });
        }

        const result = await walletService.processWithdrawal(req.user._id, amount);

        res.status(200).json({
            success: true,
            message: 'Withdrawal request processed',
            transaction: result.transaction,
            wallet: result.wallet
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            error: 'Withdrawal failed',
            message: error.message
        });
    }
};

/**
 * Get withdrawal history
 * GET /api/wallet/withdrawals
 */
exports.getWithdrawals = async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;

        const result = await walletService.getWithdrawalHistory(req.user._id, {
            limit: parseInt(limit),
            page: parseInt(page)
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Get withdrawals error:', error);
        res.status(500).json({
            error: 'Failed to fetch withdrawals',
            message: error.message
        });
    }
};

/**
 * Add bank details
 * POST /api/wallet/bank-details
 */
exports.addBankDetails = async (req, res) => {
    try {
        const { accountNumber, ifscCode, accountHolderName, bankName } = req.body;

        if (!accountNumber || !ifscCode || !accountHolderName) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'accountNumber, ifscCode, and accountHolderName are required'
            });
        }

        const wallet = await walletService.addBankDetails(req.user._id, {
            accountNumber,
            ifscCode,
            accountHolderName,
            bankName
        });

        res.status(200).json({
            success: true,
            message: 'Bank details added successfully',
            wallet
        });
    } catch (error) {
        console.error('Add bank details error:', error);
        res.status(500).json({
            error: 'Failed to add bank details',
            message: error.message
        });
    }
};

/**
 * Get earnings summary
 * GET /api/wallet/earnings
 */
exports.getEarnings = async (req, res) => {
    try {
        const earnings = await walletService.getEarningsSummary(req.user._id);

        res.status(200).json({
            success: true,
            earnings
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({
            error: 'Failed to fetch earnings',
            message: error.message
        });
    }
};

module.exports = exports;
