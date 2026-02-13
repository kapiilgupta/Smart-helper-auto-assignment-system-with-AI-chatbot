/**
 * Smart Helper Auto-Assignment System
 * Main Application Entry Point
 */

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// ============================================
// 1. EXPRESS APP CONFIGURATION
// ============================================

const app = express();
const server = http.createServer(app);

// Trust proxy (for production behind Nginx/load balancer)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ============================================
// 2. MIDDLEWARE SETUP
// ============================================

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId' // Custom session name for security
}));

// Security headers (basic - consider using helmet.js in production)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// ============================================
// 3. EJS VIEW ENGINE SETUP
// ============================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// 4. DATABASE CONNECTION
// ============================================

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-helper');
        console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`✗ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Initialize database connection
connectDB();

// ============================================
// 5. SOCKET.IO INTEGRATION
// ============================================

const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Initialize Socket.IO handlers
const { initializeSocket } = require('./config/socket');
initializeSocket(io);

// Make io accessible to routes
app.set('io', io);

// ============================================
// 6. ROUTE MOUNTING
// ============================================

// Main routes
app.use('/', require('./routes/index'));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/helpers', require('./routes/helpers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/wallet', require('./routes/wallet'));

// Health check endpoint
app.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        memory: process.memoryUsage()
    };
    res.status(200).json(healthcheck);
});

// ============================================
// 7. 404 HANDLER
// ============================================

app.use((req, res, next) => {
    // Check if it's an API request
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            error: 'Not Found',
            message: `Cannot ${req.method} ${req.path}`,
            path: req.path
        });
    }

    // Render 404 page for web requests
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        error: {
            status: 404,
            message: 'The page you are looking for does not exist.'
        }
    });
});

// ============================================
// 8. ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
    // Log error
    console.error('Error:', err.stack);

    // Set status code
    const statusCode = err.statusCode || err.status || 500;

    // API error response
    if (req.path.startsWith('/api/')) {
        return res.status(statusCode).json({
            error: err.name || 'Error',
            message: process.env.NODE_ENV === 'production'
                ? 'An error occurred'
                : err.message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        });
    }

    // Web error response
    res.status(statusCode).render('error', {
        title: `${statusCode} - Error`,
        error: {
            status: statusCode,
            message: process.env.NODE_ENV === 'production'
                ? 'An error occurred'
                : err.message
        }
    });
});

// ============================================
// 9. SERVER STARTUP
// ============================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('🚀 Smart Helper Auto-Assignment System');
    console.log('='.repeat(50));
    console.log(`✓ Server running on http://${HOST}:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Process ID: ${process.pid}`);
    console.log('='.repeat(50));
});

// ============================================
// 10. GRACEFUL SHUTDOWN HANDLING
// ============================================

const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
        console.log('✓ HTTP server closed');

        try {
            // Close Socket.IO connections
            io.close(() => {
                console.log('✓ Socket.IO connections closed');
            });

            // Close database connection
            await mongoose.connection.close();
            console.log('✓ MongoDB connection closed');

            console.log('✓ Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('✗ Error during shutdown:', error);
            process.exit(1);
        }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('✗ Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('✗ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('✗ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Export for testing
module.exports = app;
