const User = require('../models/User');

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private (User only)
 */
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password')
            .populate('bookings');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ user });
    } catch (error) { next(error);
    }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private (User only)
 */
const updateUserProfile = async (req, res, next) => {
    try {
        const { name, phone, address } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (address) user.address = address;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) { next(error);
    }
};

/**
 * Get user's booking history
 * @route GET /api/users/bookings
 * @access Private (User only)
 */
const getUserBookings = async (req, res, next) => {
    try {
        const Booking = require('../models/Booking');

        const bookings = await Booking.find({ userId: req.user.id })
            .populate('serviceId')
            .populate('helperId', '-password')
            .sort({ createdAt: -1 });

        res.json({ bookings, count: bookings.length });
    } catch (error) { next(error);
    }
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserBookings
};
