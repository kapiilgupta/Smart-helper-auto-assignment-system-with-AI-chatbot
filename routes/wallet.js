const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/auth');

// All wallet routes require authentication
router.get('/', protect, walletController.getWallet);
router.get('/transactions', protect, walletController.getTransactions);
router.post('/withdraw', protect, walletController.requestWithdrawal);
router.get('/withdrawals', protect, walletController.getWithdrawals);
router.post('/bank-details', protect, walletController.addBankDetails);
router.get('/earnings', protect, walletController.getEarnings);

module.exports = router;
