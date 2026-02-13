# Troubleshooting Guide

Common issues and solutions for the Smart Helper Auto-Assignment System.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Connection](#database-connection)
- [Authentication Problems](#authentication-problems)
- [Booking Issues](#booking-issues)
- [Socket.IO Connection](#socketio-connection)
- [Performance Issues](#performance-issues)
- [Deployment Problems](#deployment-problems)
- [API Errors](#api-errors)

---

## Installation Issues

### npm install fails

**Problem:** Dependencies fail to install

**Solutions:**

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

### Node version mismatch

**Problem:** `Error: The engine "node" is incompatible`

**Solution:**

```bash
# Check Node version
node --version

# Install Node 18+
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Permission errors

**Problem:** `EACCES: permission denied`

**Solution:**

```bash
# Fix npm permissions (Linux/Mac)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use sudo (not recommended)
sudo npm install
```

---

## Database Connection

### MongoDB connection refused

**Problem:** `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solutions:**

**1. Check if MongoDB is running:**

```bash
# Linux/Mac
sudo systemctl status mongod

# Windows
net start MongoDB

# Start MongoDB
sudo systemctl start mongod  # Linux
mongod  # Mac
net start MongoDB  # Windows
```

**2. Check connection string:**

```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-helper

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-helper
```

**3. Check firewall:**

```bash
# Allow MongoDB port
sudo ufw allow 27017
```

### Authentication failed

**Problem:** `MongoServerError: Authentication failed`

**Solutions:**

**1. Verify credentials:**

```javascript
// Check username and password in .env
MONGODB_URI=mongodb://username:password@localhost:27017/smart-helper
```

**2. Create user:**

```bash
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["root"]
})
```

### Database not found

**Problem:** Database doesn't exist

**Solution:**

```bash
# MongoDB creates database automatically on first write
# Just run the seed script
npm run seed
```

---

## Authentication Problems

### JWT token invalid

**Problem:** `401 Unauthorized: Invalid token`

**Solutions:**

**1. Check token format:**

```javascript
// Correct format
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Wrong format
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  // Missing "Bearer"
```

**2. Verify JWT secret:**

```env
# Make sure JWT_SECRET is set and consistent
JWT_SECRET=your-secret-key-min-32-characters
```

**3. Check token expiration:**

```javascript
// Token might be expired (default 24 hours)
// Login again to get new token
```

### Session not persisting

**Problem:** User logged out on page refresh

**Solutions:**

**1. Check session configuration:**

```javascript
// server.js
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // false in development
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

**2. Check HTTPS in production:**

```env
# Set secure cookies only in production
NODE_ENV=production
```

### Password hash comparison fails

**Problem:** Login fails with correct password

**Solution:**

```javascript
// Make sure bcrypt is comparing correctly
const isMatch = await bcrypt.compare(password, user.password);

// Check bcrypt rounds (should be 10)
const hashedPassword = await bcrypt.hash(password, 10);
```

---

## Booking Issues

### Helper not assigned

**Problem:** Booking stays in "pending" status

**Solutions:**

**1. Check available helpers:**

```javascript
// Verify helpers exist in database
db.users.find({ role: 'helper', availability: true })

// Check geospatial index
db.users.getIndexes()
```

**2. Check assignment algorithm:**

```bash
# Check server logs for errors
pm2 logs
# or
npm run dev
```

**3. Verify location data:**

```javascript
// Location must be in correct format
{
  type: 'Point',
  coordinates: [longitude, latitude]  // Note: longitude first!
}
```

### Reassignment not working

**Problem:** Booking not reassigned after rejection

**Solutions:**

**1. Check timeout logic:**

```javascript
// Verify 30-second timeout is configured
const ASSIGNMENT_TIMEOUT = 30000; // 30 seconds
```

**2. Check rejected helpers array:**

```javascript
// Ensure rejected helpers are tracked
booking.rejectedHelpers.push(helperId);
```

### Geospatial query fails

**Problem:** No helpers found within radius

**Solutions:**

**1. Create 2dsphere index:**

```bash
mongo
use smart-helper
db.users.createIndex({ location: "2dsphere" })
```

**2. Verify coordinates:**

```javascript
// Correct order: [longitude, latitude]
coordinates: [77.2090, 28.6139]  // ✓ Correct
coordinates: [28.6139, 77.2090]  // ✗ Wrong
```

**3. Check radius:**

```javascript
// Radius is in meters
$maxDistance: 10000  // 10km
```

---

## Socket.IO Connection

### WebSocket connection failed

**Problem:** `WebSocket connection to 'ws://...' failed`

**Solutions:**

**1. Check CORS configuration:**

```javascript
// server.js
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});
```

**2. Check Nginx configuration:**

```nginx
# nginx.conf
location /socket.io/ {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

**3. Check firewall:**

```bash
# Allow WebSocket connections
sudo ufw allow 3000/tcp
```

### Events not received

**Problem:** Client not receiving Socket.IO events

**Solutions:**

**1. Verify room joining:**

```javascript
// Client must join room
socket.emit('join', { userId: userId });

// Server must add to room
socket.join(`user:${userId}`);
```

**2. Check event names:**

```javascript
// Event names must match exactly
// Server
io.to(`user:${userId}`).emit('booking:created', data);

// Client
socket.on('booking:created', (data) => { ... });
```

**3. Check connection status:**

```javascript
// Client
console.log('Connected:', socket.connected);

// Reconnect if needed
socket.connect();
```

---

## Performance Issues

### Slow database queries

**Problem:** API responses are slow

**Solutions:**

**1. Add indexes:**

```bash
mongo
use smart-helper
db.users.createIndex({ email: 1 })
db.users.createIndex({ location: "2dsphere" })
db.bookings.createIndex({ userId: 1 })
db.bookings.createIndex({ helperId: 1 })
db.bookings.createIndex({ status: 1 })
```

**2. Use lean queries:**

```javascript
// Faster queries
const users = await User.find().lean();

// Instead of
const users = await User.find();
```

**3. Limit results:**

```javascript
// Paginate results
const users = await User.find()
  .limit(20)
  .skip(page * 20);
```

### High memory usage

**Problem:** Application using too much memory

**Solutions:**

**1. Check for memory leaks:**

```bash
# Monitor memory
pm2 monit

# Restart if memory > 1GB
pm2 restart smart-helper
```

**2. Configure PM2:**

```javascript
// ecosystem.config.js
max_memory_restart: '1G'
```

**3. Close database connections:**

```javascript
// Graceful shutdown
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
```

### Slow API responses

**Problem:** API taking > 1 second to respond

**Solutions:**

**1. Enable caching:**

```javascript
// Use Redis for caching
const redis = require('redis');
const client = redis.createClient();

// Cache service list
const services = await client.get('services');
if (!services) {
  const data = await Service.find();
  await client.setex('services', 3600, JSON.stringify(data));
}
```

**2. Optimize queries:**

```javascript
// Use projection
const users = await User.find({}, 'name email');

// Use select
const users = await User.find().select('name email');
```

---

## Deployment Problems

### PM2 app not starting

**Problem:** `pm2 start` fails

**Solutions:**

**1. Check logs:**

```bash
pm2 logs smart-helper --lines 100
```

**2. Verify environment:**

```bash
# Check .env.production exists
ls -la .env.production

# Verify NODE_ENV
echo $NODE_ENV
```

**3. Test manually:**

```bash
# Run without PM2
NODE_ENV=production node server.js
```

### Nginx 502 Bad Gateway

**Problem:** Nginx shows 502 error

**Solutions:**

**1. Check app is running:**

```bash
pm2 status
# or
curl http://localhost:3000/health
```

**2. Check Nginx config:**

```bash
sudo nginx -t
sudo systemctl restart nginx
```

**3. Check logs:**

```bash
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate errors

**Problem:** HTTPS not working

**Solutions:**

**1. Verify certificate:**

```bash
sudo certbot certificates
```

**2. Renew certificate:**

```bash
sudo certbot renew
sudo systemctl reload nginx
```

**3. Check Nginx SSL config:**

```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

---

## API Errors

### 400 Bad Request

**Problem:** Invalid request data

**Solutions:**

**1. Check request body:**

```javascript
// Ensure Content-Type is set
headers: {
  'Content-Type': 'application/json'
}

// Verify JSON format
JSON.stringify(data)
```

**2. Validate required fields:**

```javascript
// Check API documentation for required fields
{
  "email": "required",
  "password": "required"
}
```

### 401 Unauthorized

**Problem:** Authentication failed

**Solutions:**

**1. Include auth token:**

```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

**2. Check token validity:**

```bash
# Decode JWT token
jwt.io
```

### 404 Not Found

**Problem:** Endpoint not found

**Solutions:**

**1. Verify URL:**

```javascript
// Correct
POST /api/auth/login

// Wrong
POST /api/login  // Missing 'auth'
```

**2. Check route mounting:**

```javascript
// server.js
app.use('/api/auth', require('./routes/auth'));
```

### 500 Internal Server Error

**Problem:** Server error

**Solutions:**

**1. Check server logs:**

```bash
pm2 logs
# or
tail -f logs/app.log
```

**2. Enable debug mode:**

```env
NODE_ENV=development
LOG_LEVEL=debug
```

**3. Check database connection:**

```bash
mongo
show dbs
```

---

## Common Error Messages

### "Cannot find module"

**Solution:**

```bash
npm install <missing-module>
```

### "Port already in use"

**Solution:**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### "CORS policy blocked"

**Solution:**

```javascript
// Add CORS middleware
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
```

---

## Getting Help

If you can't resolve the issue:

1. **Check Documentation**: Review relevant docs
2. **Search GitHub Issues**: Look for similar problems
3. **Enable Debug Logging**: Set `LOG_LEVEL=debug`
4. **Collect Information**:
   - Error messages
   - Server logs
   - Environment details
   - Steps to reproduce

5. **Contact Support**:
   - Email: support@smarthelper.com
   - GitHub: [Open Issue](https://github.com/kapiilgupta/Smart-helper-auto-assignment-system-with-AI-chatbot/issues)

---

## Debugging Tips

**1. Use console.log strategically:**

```javascript
console.log('Request received:', req.body);
console.log('User found:', user);
console.log('About to save:', booking);
```

**2. Check environment variables:**

```javascript
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', process.env.MONGODB_URI);
```

**3. Test endpoints with curl:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**4. Use Postman for API testing**

**5. Monitor with PM2:**

```bash
pm2 monit
pm2 logs --lines 200
```

---

## Prevention

**Best Practices to Avoid Issues:**

1. ✅ Always use environment variables
2. ✅ Validate input data
3. ✅ Handle errors gracefully
4. ✅ Log important events
5. ✅ Test before deploying
6. ✅ Keep dependencies updated
7. ✅ Use version control
8. ✅ Monitor application health
9. ✅ Regular backups
10. ✅ Document changes
