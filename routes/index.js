const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Smart Helper',
        user: req.session.userId ? { id: req.session.userId, role: req.session.role } : null
    });
});

// User login page
router.get('/login', (req, res) => {
    res.render('login', {
        title: 'User Login',
        userType: 'user'
    });
});

// User register page
router.get('/register', (req, res) => {
    res.render('register', {
        title: 'User Registration',
        userType: 'user'
    });
});

// Helper login page
router.get('/helper/login', (req, res) => {
    res.render('login', {
        title: 'Helper Login',
        userType: 'helper'
    });
});

// Helper register page
router.get('/helper/register', (req, res) => {
    res.render('register', {
        title: 'Helper Registration',
        userType: 'helper'
    });
});

// Dashboard (protected)
router.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('dashboard', {
        title: 'Dashboard',
        user: { id: req.session.userId, role: req.session.role }
    });
});

// User routes (protected)
router.get('/user/home', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('user/home', {
        title: 'Home - Smart Helper',
        user: { _id: req.session.userId, role: req.session.role }
    });
});

router.get('/user/booking', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('user/booking', {
        title: 'Book a Service',
        user: { _id: req.session.userId, role: req.session.role }
    });
});

router.get('/user/booking-status', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('user/booking-status', {
        title: 'Booking Status',
        user: { _id: req.session.userId, role: req.session.role }
    });
});

router.get('/user/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('user/dashboard', {
        title: 'My Dashboard',
        user: { _id: req.session.userId, role: req.session.role }
    });
});

router.get('/user/profile', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('user/profile', {
        title: 'My Profile',
        user: { _id: req.session.userId, role: req.session.role }
    });
});

module.exports = router;
