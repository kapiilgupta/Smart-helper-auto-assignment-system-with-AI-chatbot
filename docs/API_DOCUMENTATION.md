# API Documentation

Complete API reference for the Smart Helper Auto-Assignment System.

## Base URL

```
Development: http://localhost:3000/api
Production: https://yourdomain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+919876543210",
  "role": "user",
  "location": {
    "type": "Point",
    "coordinates": [77.2090, 28.6139],
    "address": {
      "street": "123 Main St",
      "city": "New Delhi",
      "state": "Delhi",
      "zipCode": "110001"
    }
  }
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phone": "+919876543210"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+919876543210",
    "role": "user"
  }'
```

---

### Login

Authenticate and receive JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## User Endpoints

### Get User Profile

Get authenticated user's profile.

**Endpoint:** `GET /api/users/profile`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+919876543210",
  "role": "user",
  "location": {
    "type": "Point",
    "coordinates": [77.2090, 28.6139]
  },
  "createdAt": "2024-02-14T10:00:00.000Z"
}
```

---

### Update User Profile

Update user information.

**Endpoint:** `PUT /api/users/profile`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "+919876543211",
  "location": {
    "type": "Point",
    "coordinates": [77.2100, 28.6150]
  }
}
```

**Response:** `200 OK`

---

## Service Endpoints

### Get All Services

Retrieve all available services.

**Endpoint:** `GET /api/services`

**Response:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Plumbing Repair",
    "category": "plumbing",
    "description": "Fix leaks, install fixtures, repair pipes",
    "basePrice": 500,
    "estimatedDuration": 60,
    "icon": "bi-wrench"
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "name": "Electrical Work",
    "category": "electrical",
    "description": "Wiring, switch installation",
    "basePrice": 600,
    "estimatedDuration": 90,
    "icon": "bi-lightning"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/services
```

---

### Get Service by ID

Get details of a specific service.

**Endpoint:** `GET /api/services/:id`

**Response:** `200 OK`

---

## Booking Endpoints

### Create Booking

Create a new service booking.

**Endpoint:** `POST /api/bookings`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "serviceId": "507f1f77bcf86cd799439012",
  "location": {
    "type": "Point",
    "coordinates": [77.2090, 28.6139]
  },
  "scheduledTime": "2024-02-14T15:00:00.000Z",
  "notes": "Please bring necessary tools"
}
```

**Response:** `201 Created`
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "userId": "507f1f77bcf86cd799439011",
  "serviceId": "507f1f77bcf86cd799439012",
  "status": "pending",
  "location": {
    "type": "Point",
    "coordinates": [77.2090, 28.6139]
  },
  "scheduledTime": "2024-02-14T15:00:00.000Z",
  "notes": "Please bring necessary tools",
  "createdAt": "2024-02-14T10:00:00.000Z"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "507f1f77bcf86cd799439012",
    "location": {
      "type": "Point",
      "coordinates": [77.2090, 28.6139]
    },
    "scheduledTime": "2024-02-14T15:00:00.000Z"
  }'
```

---

### Get User Bookings

Get all bookings for authenticated user.

**Endpoint:** `GET /api/bookings`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (pending, assigned, in-progress, completed, cancelled)
- `limit` (optional): Number of results (default: 20)
- `page` (optional): Page number (default: 1)

**Response:** `200 OK`
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "userId": "507f1f77bcf86cd799439011",
    "serviceId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Plumbing Repair"
    },
    "helperId": {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Rajesh Kumar"
    },
    "status": "assigned",
    "createdAt": "2024-02-14T10:00:00.000Z"
  }
]
```

**Example:**
```bash
curl http://localhost:3000/api/bookings?status=pending \
  -H "Authorization: Bearer <token>"
```

---

### Get Booking by ID

Get details of a specific booking.

**Endpoint:** `GET /api/bookings/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Update Booking Status

Update the status of a booking.

**Endpoint:** `PATCH /api/bookings/:id/status`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "in-progress"
}
```

**Response:** `200 OK`

**Valid Status Transitions:**
- `pending` → `assigned`
- `assigned` → `in-progress`
- `in-progress` → `completed`
- Any → `cancelled`

---

### Cancel Booking

Cancel a booking.

**Endpoint:** `DELETE /api/bookings/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

## Helper Endpoints

### Get Helper Dashboard

Get helper's dashboard data.

**Endpoint:** `GET /api/helpers/dashboard`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "activeBookings": 2,
  "completedToday": 5,
  "earnings": {
    "today": 2500,
    "week": 15000,
    "month": 45000
  },
  "rating": 4.8,
  "availability": true
}
```

---

### Update Helper Availability

Toggle helper availability status.

**Endpoint:** `PATCH /api/helpers/availability`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "availability": true
}
```

**Response:** `200 OK`

---

### Accept Booking

Accept an assigned booking.

**Endpoint:** `POST /api/bookings/:id/accept`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Reject Booking

Reject an assigned booking (triggers reassignment).

**Endpoint:** `POST /api/bookings/:id/reject`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Update Location

Update helper's current location.

**Endpoint:** `PATCH /api/helpers/location`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "location": {
    "type": "Point",
    "coordinates": [77.2095, 28.6145]
  }
}
```

**Response:** `200 OK`

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": ["Email is required", "Password must be at least 6 characters"]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

API requests are limited to:
- **100 requests per 15 minutes** per IP address
- **10 requests per second** for booking endpoints

Exceeded limits return `429 Too Many Requests`.

---

## WebSocket Events (Socket.IO)

### Client → Server

**Join Room:**
```javascript
socket.emit('join', { userId: '507f1f77bcf86cd799439011' });
```

**Update Location:**
```javascript
socket.emit('location-update', {
  helperId: '507f1f77bcf86cd799439015',
  location: { type: 'Point', coordinates: [77.2095, 28.6145] }
});
```

### Server → Client

**Booking Created:**
```javascript
socket.on('booking:created', (data) => {
  console.log('New booking:', data.bookingId);
});
```

**Helper Assigned:**
```javascript
socket.on('booking:helper-assigned', (data) => {
  console.log('Helper assigned:', data.helperId);
});
```

**Location Update:**
```javascript
socket.on('helper:location-update', (data) => {
  console.log('Helper location:', data.location);
});
```

**Notification:**
```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data.message);
});
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response Headers:**
```
X-Total-Count: 150
X-Page: 1
X-Per-Page: 20
X-Total-Pages: 8
```

---

## Testing with Postman

Import the Postman collection: [Download Collection](../postman/smart-helper.postman_collection.json)

Or use the examples above with curl or any HTTP client.
