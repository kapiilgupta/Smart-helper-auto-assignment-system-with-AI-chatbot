const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    revieweeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['user_to_helper', 'helper_to_user'],
        required: true,
        index: true
    },
    rating: {
        overall: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        professionalism: {
            type: Number,
            min: 1,
            max: 5
        },
        quality: {
            type: Number,
            min: 1,
            max: 5
        },
        timeliness: {
            type: Number,
            min: 1,
            max: 5
        },
        communication: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    comment: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'approved',
        index: true
    },
    moderationFlags: {
        hasProfanity: {
            type: Boolean,
            default: false
        },
        isSpam: {
            type: Boolean,
            default: false
        },
        flaggedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        flagReason: String,
        moderatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        moderatedAt: Date
    },
    helpful: {
        count: {
            type: Number,
            default: 0
        },
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    response: {
        comment: String,
        createdAt: Date
    }
}, {
    timestamps: true
});

// Compound indexes
reviewSchema.index({ revieweeId: 1, status: 1, createdAt: -1 });
reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true }); // Prevent duplicate reviews

// Virtual for formatted rating
reviewSchema.virtual('formattedRating').get(function () {
    return this.rating.overall.toFixed(1);
});

// Method to mark as helpful
reviewSchema.methods.markHelpful = async function (userId) {
    if (!this.helpful.users.includes(userId)) {
        this.helpful.users.push(userId);
        this.helpful.count += 1;
        await this.save();
    }
};

// Method to add response (for reviewee)
reviewSchema.methods.addResponse = async function (comment) {
    this.response = {
        comment,
        createdAt: new Date()
    };
    await this.save();
};

// Method to flag for moderation
reviewSchema.methods.flag = async function (reason, flaggedBy) {
    this.status = 'flagged';
    this.moderationFlags.flagReason = reason;
    this.moderationFlags.flaggedBy = flaggedBy;
    await this.save();
};

// Method to moderate (approve/reject)
reviewSchema.methods.moderate = async function (status, moderatedBy) {
    if (!['approved', 'rejected'].includes(status)) {
        throw new Error('Invalid moderation status');
    }

    this.status = status;
    this.moderationFlags.moderatedBy = moderatedBy;
    this.moderationFlags.moderatedAt = new Date();
    await this.save();
};

// Static method to get reviews for a user/helper
reviewSchema.statics.getReviews = function (revieweeId, options = {}) {
    const { limit = 20, page = 1, status = 'approved', sort = '-createdAt' } = options;

    return this.find({ revieweeId, status })
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate('reviewerId', 'name profilePicture')
        .populate('bookingId', 'serviceId scheduledTime');
};

// Static method to get average rating
reviewSchema.statics.getAverageRating = async function (revieweeId) {
    const result = await this.aggregate([
        {
            $match: {
                revieweeId: mongoose.Types.ObjectId(revieweeId),
                status: 'approved'
            }
        },
        {
            $group: {
                _id: null,
                averageOverall: { $avg: '$rating.overall' },
                averageProfessionalism: { $avg: '$rating.professionalism' },
                averageQuality: { $avg: '$rating.quality' },
                averageTimeliness: { $avg: '$rating.timeliness' },
                averageCommunication: { $avg: '$rating.communication' },
                totalReviews: { $sum: 1 },
                rating5: {
                    $sum: {
                        $cond: [{ $gte: ['$rating.overall', 4.5] }, 1, 0]
                    }
                },
                rating4: {
                    $sum: {
                        $cond: [
                            { $and: [{ $gte: ['$rating.overall', 3.5] }, { $lt: ['$rating.overall', 4.5] }] },
                            1,
                            0
                        ]
                    }
                },
                rating3: {
                    $sum: {
                        $cond: [
                            { $and: [{ $gte: ['$rating.overall', 2.5] }, { $lt: ['$rating.overall', 3.5] }] },
                            1,
                            0
                        ]
                    }
                },
                rating2: {
                    $sum: {
                        $cond: [
                            { $and: [{ $gte: ['$rating.overall', 1.5] }, { $lt: ['$rating.overall', 2.5] }] },
                            1,
                            0
                        ]
                    }
                },
                rating1: {
                    $sum: {
                        $cond: [{ $lt: ['$rating.overall', 1.5] }, 1, 0]
                    }
                }
            }
        }
    ]);

    if (result.length === 0) {
        return {
            averageRating: 0,
            totalReviews: 0,
            ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
            categoryRatings: {}
        };
    }

    const data = result[0];

    return {
        averageRating: Math.round(data.averageOverall * 10) / 10,
        totalReviews: data.totalReviews,
        ratingBreakdown: {
            5: data.rating5,
            4: data.rating4,
            3: data.rating3,
            2: data.rating2,
            1: data.rating1
        },
        categoryRatings: {
            professionalism: Math.round(data.averageProfessionalism * 10) / 10,
            quality: Math.round(data.averageQuality * 10) / 10,
            timeliness: Math.round(data.averageTimeliness * 10) / 10,
            communication: Math.round(data.averageCommunication * 10) / 10
        }
    };
};

// Static method to check if user can review
reviewSchema.statics.canReview = async function (reviewerId, bookingId) {
    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(bookingId);

    if (!booking) {
        return { allowed: false, reason: 'Booking not found' };
    }

    if (booking.status !== 'completed') {
        return { allowed: false, reason: 'Booking not completed' };
    }

    // Check if already reviewed
    const existingReview = await this.findOne({ reviewerId, bookingId });
    if (existingReview) {
        return { allowed: false, reason: 'Already reviewed' };
    }

    return { allowed: true };
};

module.exports = mongoose.model('Review', reviewSchema);
