const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifyToken } = require('../middleware/authMiddleware');

// All wallet routes require authentication
router.get('/', verifyToken, walletController.getWallet);
router.get('/transactions', verifyToken, walletController.getTransactions);
router.post('/withdraw', verifyToken, walletController.requestWithdrawal);
router.get('/withdrawals', verifyToken, walletController.getWithdrawals);
router.post('/bank-details', verifyToken, walletController.addBankDetails);
router.get('/earnings', verifyToken, walletController.getEarnings);

module.exports = router;
