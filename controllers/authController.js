const User = require('../models/User');
const Helper = require('../models/Helper');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, phone, address } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            address
        });

        if (user) {
            const token = generateToken(user._id, 'user');

            // Store token in session for web
            req.session.token = token;
            req.session.userId = user._id;
            req.session.role = 'user';

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                token
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            const token = generateToken(user._id, 'user');

            // Store token in session for web
            req.session.token = token;
            req.session.userId = user._id;
            req.session.role = 'user';

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Register a new helper
// @route   POST /api/auth/helper/register
// @access  Public
const registerHelper = async (req, res, next) => {
    try {
        const { name, email, password, phone, skills, location } = req.body;

        // Check if helper exists
        const helperExists = await Helper.findOne({ email });
        if (helperExists) {
            return res.status(400).json({ message: 'Helper already exists' });
        }

        // Create helper
        const helper = await Helper.create({
            name,
            email,
            password,
            phone,
            skills,
            location
        });

        if (helper) {
            const token = generateToken(helper._id, 'helper');

            // Store token in session for web
            req.session.token = token;
            req.session.userId = helper._id;
            req.session.role = 'helper';

            res.status(201).json({
                _id: helper._id,
                name: helper.name,
                email: helper.email,
                phone: helper.phone,
                skills: helper.skills,
                token
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Login helper
// @route   POST /api/auth/helper/login
// @access  Public
const loginHelper = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find helper
        const helper = await Helper.findOne({ email });

        if (helper && (await helper.comparePassword(password))) {
            const token = generateToken(helper._id, 'helper');

            // Store token in session for web
            req.session.token = token;
            req.session.userId = helper._id;
            req.session.role = 'helper';

            res.json({
                _id: helper._id,
                name: helper.name,
                email: helper.email,
                phone: helper.phone,
                skills: helper.skills,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user/helper
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.json({ message: 'Logged out successfully' });
    });
};

module.exports = {
    registerUser,
    loginUser,
    registerHelper,
    loginHelper,
    logout
};
