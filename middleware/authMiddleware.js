const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.session?.token;

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// Middleware to check if user is a helper
const isHelper = (req, res, next) => {
    if (req.user && req.user.role === 'helper') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Helper role required.' });
    }
};

// Middleware to check if user is a regular user
const isUser = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. User role required.' });
    }
};

// Middleware to check if user has specific role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user.role || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { verifyToken, isHelper, isUser, authorize };
