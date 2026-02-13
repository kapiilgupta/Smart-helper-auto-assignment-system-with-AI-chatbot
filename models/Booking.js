const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    helperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Helper',
        default: null
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: [true, 'Service ID is required']
    },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'accepted', 'in-progress', 'completed', 'cancelled', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    scheduledTime: {
        type: Date,
        required: [true, 'Scheduled time is required']
    },
    completedAt: {
        type: Date
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        address: {
            street: String,
            city: String,
            state: String,
            zipCode: String
        }
    },
    assignmentHistory: [{
        helperId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Helper'
        },
        assignedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['assigned', 'rejected', 'timeout']
        },
        rejectedAt: Date,
        reason: String
    }],
    rejectionCount: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        min: 0
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending',
        index: true
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'stripe', 'cash', 'wallet'],
        default: 'cash'
    },
    amount: {
        type: Number,
        min: 0
    },
    platformFee: {
        type: Number,
        min: 0,
        default: function () {
            const feePercentage = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 20;
            return this.amount ? (this.amount * feePercentage) / 100 : 0;
        }
    },
    helperEarnings: {
        type: Number,
        min: 0
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    },
    notes: {
        type: String,
        trim: true
    }
});

// Create geospatial index for location-based queries
bookingSchema.index({ location: '2dsphere' });

// Index for efficient status queries
bookingSchema.index({ status: 1 });

// Compound index for user bookings
bookingSchema.index({ userId: 1, createdAt: -1 });

// Compound index for helper bookings
bookingSchema.index({ helperId: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
