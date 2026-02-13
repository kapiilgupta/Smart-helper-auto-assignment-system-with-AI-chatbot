const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    totalEarnings: {
        type: Number,
        default: 0,
        min: 0
    },
    totalWithdrawals: {
        type: Number,
        default: 0,
        min: 0
    },
    pendingAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    lastWithdrawal: {
        type: Date
    },
    bankDetails: {
        accountNumber: String,
        ifscCode: String,
        accountHolderName: String,
        bankName: String,
        verified: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true
});

// Virtual for available balance (balance - pending)
walletSchema.virtual('availableBalance').get(function () {
    return this.balance - this.pendingAmount;
});

// Method to credit wallet
walletSchema.methods.credit = async function (amount, description = '') {
    if (amount <= 0) {
        throw new Error('Credit amount must be positive');
    }

    this.balance += amount;
    this.totalEarnings += amount;

    return this.save();
};

// Method to debit wallet
walletSchema.methods.debit = async function (amount, description = '') {
    if (amount <= 0) {
        throw new Error('Debit amount must be positive');
    }

    if (this.availableBalance < amount) {
        throw new Error('Insufficient balance');
    }

    this.balance -= amount;
    this.totalWithdrawals += amount;
    this.lastWithdrawal = new Date();

    return this.save();
};

// Method to check if withdrawal is allowed
walletSchema.methods.canWithdraw = function (amount) {
    const minWithdrawal = process.env.MINIMUM_WITHDRAWAL_AMOUNT || 500;

    if (amount < minWithdrawal) {
        return {
            allowed: false,
            reason: `Minimum withdrawal amount is ₹${minWithdrawal}`
        };
    }

    if (this.availableBalance < amount) {
        return {
            allowed: false,
            reason: 'Insufficient balance'
        };
    }

    if (!this.bankDetails || !this.bankDetails.verified) {
        return {
            allowed: false,
            reason: 'Bank details not verified'
        };
    }

    return { allowed: true };
};

// Method to add pending amount (for in-progress bookings)
walletSchema.methods.addPending = async function (amount) {
    this.pendingAmount += amount;
    return this.save();
};

// Method to release pending amount
walletSchema.methods.releasePending = async function (amount) {
    this.pendingAmount = Math.max(0, this.pendingAmount - amount);
    return this.save();
};

// Static method to get or create wallet
walletSchema.statics.getOrCreate = async function (userId) {
    let wallet = await this.findOne({ userId });

    if (!wallet) {
        wallet = await this.create({ userId });
    }

    return wallet;
};

// Pre-save validation
walletSchema.pre('save', function (next) {
    if (this.balance < 0) {
        return next(new Error('Wallet balance cannot be negative'));
    }
    if (this.pendingAmount < 0) {
        return next(new Error('Pending amount cannot be negative'));
    }
    next();
});

module.exports = mongoose.model('Wallet', walletSchema);
