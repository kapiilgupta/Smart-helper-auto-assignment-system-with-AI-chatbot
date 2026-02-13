# Smart Helper Auto-Assignment System

A location-based, on-demand service platform designed to solve latency issues in traditional booking systems with a **15-minute service promise** by automating real-time connections between users and household service professionals.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-blue.svg)](https://socket.io/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

## 🚀 Features

- **Smart Helper Assignment** - AI-powered algorithm assigns nearest available helper within seconds
- **Real-Time Tracking** - Live location updates via Socket.IO
- **Auto-Reassignment** - Automatic reassignment on helper rejection (30-second timeout)
- **Geofencing** - 10km radius-based helper matching using MongoDB geospatial queries
- **Multi-Channel Notifications** - SMS (Twilio), Email, and In-App notifications
- **Role-Based Access** - Separate interfaces for Users, Helpers, and Admins
- **Comprehensive Testing** - 60+ test cases with Jest
- **Production-Ready** - Docker, PM2, Nginx, SSL/TLS configuration

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## 🔧 Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** 7.0+ (or MongoDB Atlas account)
- **Redis** 7+ (optional, for caching)
- **Git**

**Optional:**
- Docker & Docker Compose
- PM2 for process management
- Nginx for reverse proxy

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/kapiilgupta/Smart-helper-auto-assignment-system-with-AI-chatbot.git
cd Smart-helper-auto-assignment-system-with-AI-chatbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-helper

# Security
JWT_SECRET=your-jwt-secret-min-32-characters
SESSION_SECRET=your-session-secret-min-32-characters

# Twilio (Optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 4. Database Setup

**Local MongoDB:**
```bash
# Start MongoDB
mongod

# Seed database
npm run seed
```

**MongoDB Atlas:**
See [MONGODB_ATLAS_SETUP.md](MONGODB_ATLAS_SETUP.md) for detailed instructions.

## 🎯 Running the Application

### Development Mode

```bash
npm run dev
```

Access the application at `http://localhost:3000`

### Production Mode

```bash
npm start
```

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart smart-helper
```

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🚀 Deployment

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong JWT and session secrets
- [ ] Configure MongoDB Atlas or secure MongoDB instance
- [ ] Set up SSL/TLS certificates (see [SSL_SETUP.md](SSL_SETUP.md))
- [ ] Configure Nginx reverse proxy
- [ ] Enable firewall (ports 80, 443)
- [ ] Set up monitoring and logging
- [ ] Configure automated backups
- [ ] Test all endpoints
- [ ] Run security audit: `npm audit`

### Deployment Options

**1. Docker Deployment:**
```bash
# Production build
docker-compose -f docker-compose.yml up -d

# Check status
docker-compose ps
```

**2. Traditional Server Deployment:**
```bash
# Install dependencies
npm ci --only=production

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

**3. Cloud Platforms:**
- **AWS EC2** - Use PM2 + Nginx
- **Heroku** - Use Procfile
- **DigitalOcean** - Use Docker or PM2
- **Google Cloud** - Use Cloud Run or Compute Engine

See detailed deployment guides in the `/docs` folder.

## 📚 API Documentation

### Authentication

**Register:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user"
}
```

**Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Bookings

**Create Booking:**
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceId": "507f1f77bcf86cd799439011",
  "location": {
    "type": "Point",
    "coordinates": [77.2090, 28.6139]
  },
  "scheduledTime": "2024-02-14T10:00:00Z"
}
```

**Get Bookings:**
```http
GET /api/bookings
Authorization: Bearer <token>
```

For complete API documentation, see [API.md](API.md).

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
npm test -- auth.test.js
npm test -- assignment.test.js
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

### Test Suites

- **auth.test.js** - Authentication & authorization
- **assignment.test.js** - Helper assignment algorithm
- **reassignment.test.js** - Reassignment logic
- **geospatial.test.js** - Geospatial queries
- **socket.test.js** - Socket.IO events
- **booking.test.js** - Booking workflows
- **geoUtils.test.js** - Geofencing utilities

## 📁 Project Structure

```
smart-helper/
├── config/              # Configuration files
│   ├── database.js      # MongoDB connection
│   └── socket.js        # Socket.IO setup
├── models/              # Mongoose schemas
│   ├── User.js
│   ├── Service.js
│   └── Booking.js
├── routes/              # Express routes
│   └── index.js
├── services/            # Business logic
│   ├── assignmentService.js
│   └── notificationService.js
├── utils/               # Utility functions
│   └── geoUtils.js      # Geofencing utilities
├── views/               # EJS templates
│   ├── user/            # User interface
│   ├── helper/          # Helper interface
│   └── admin/           # Admin interface
├── public/              # Static assets
│   ├── css/
│   └── js/
├── tests/               # Test suites
├── nginx/               # Nginx configuration
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose setup
├── ecosystem.config.js  # PM2 configuration
└── server.js            # Application entry point
```

## 🔒 Security Best Practices

- ✅ Environment variables for sensitive data
- ✅ Password hashing with bcrypt
- ✅ JWT authentication
- ✅ Rate limiting on API endpoints
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (MongoDB)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ SSL/TLS encryption

## 🛠️ Technologies Used

- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Real-Time:** Socket.IO
- **Authentication:** JWT, bcrypt
- **Notifications:** Twilio (SMS), Nodemailer (Email)
- **Testing:** Jest, Supertest
- **Deployment:** Docker, PM2, Nginx
- **Frontend:** EJS, Bootstrap 5, Leaflet.js

## 📊 Performance

- **Helper Assignment:** <1 second
- **Geospatial Queries:** <100ms (1000+ helpers)
- **Reassignment:** <500ms
- **Socket.IO Events:** <10ms latency

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Kapil Gupta** - [GitHub](https://github.com/kapiilgupta)

## 🙏 Acknowledgments

- MongoDB for geospatial query capabilities
- Socket.IO for real-time communication
- Twilio for SMS notifications
- Let's Encrypt for free SSL certificates

## 📞 Support

For support, email support@smarthelper.com or open an issue on GitHub.

## 🗺️ Roadmap

- [ ] AI-powered demand prediction
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Advanced analytics dashboard
- [ ] Helper rating and review system
- [ ] Subscription plans
- [ ] Referral program

---

Made with ❤️ by the Smart Helper Team
