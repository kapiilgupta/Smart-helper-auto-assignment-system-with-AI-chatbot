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

module.exports = router;
