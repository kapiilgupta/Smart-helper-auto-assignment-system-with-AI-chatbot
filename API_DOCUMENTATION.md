# Smart Helper Auto-Assignment System - API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Routes (`/api/auth`)

### User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "coordinates": [72.8777, 19.0760]
  }
}
```

### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Helper Registration
```http
POST /api/auth/helper/register
Content-Type: application/json

{
  "name": "Helper Name",
  "email": "helper@example.com",
  "password": "password123",
  "phone": "1234567890",
  "skills": ["Plumbing", "Electrical"],
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760]
  }
}
```

### Helper Login
```http
POST /api/auth/helper/login
Content-Type: application/json

{
  "email": "helper@example.com",
  "password": "password123"
}
```

---

## User Routes (`/api/users`)
*Requires authentication and user role*

### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
```

### Update User Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "9876543210",
  "address": {
    "street": "456 New St",
    "city": "Mumbai",
    "coordinates": [72.8888, 19.0888]
  }
}
```

### Get User's Booking History
```http
GET /api/users/bookings
Authorization: Bearer <token>
```

---

## Service Routes (`/api/services`)
*Public access*

### Get All Services
```http
GET /api/services
GET /api/services?category=Plumbing
```

### Get Service by ID
```http
GET /api/services/:id
```

---

## Booking Routes (`/api/bookings`)

### Create Booking (User)
```http
POST /api/bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "serviceId": "service_id_here",
  "scheduledTime": "2026-02-15T10:00:00",
  "location": {
    "type": "Point",
    "coordinates": [72.8777, 19.0760],
    "address": {
      "street": "123 Main St",
      "city": "Mumbai"
    }
  },
  "notes": "Please bring tools"
}
```

**Response**: Includes assigned helper with distance and rating

### Get User's Bookings
```http
GET /api/bookings
Authorization: Bearer <token>
```

### Get Booking by ID
```http
GET /api/bookings/:id
Authorization: Bearer <token>
```

### Cancel Booking (User)
```http
PUT /api/bookings/:id/cancel
Authorization: Bearer <token>
```

### Get Helper's Bookings
```http
GET /api/bookings/helper
GET /api/bookings/helper?status=assigned
Authorization: Bearer <token>
```

### Accept Booking (Helper)
```http
PUT /api/bookings/:id/accept
Authorization: Bearer <token>
```

### Reject Booking (Helper)
```http
PUT /api/bookings/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Not available at this time"
}
```

### Update Booking Status (Helper)
```http
PUT /api/bookings/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in-progress"
}
```

---

## Helper Routes (`/api/helpers`)

### Get Nearby Helpers (Public)
```http
GET /api/helpers/nearby?lng=72.8777&lat=19.0760&maxDistance=10000
GET /api/helpers/nearby?lng=72.8777&lat=19.0760&skills=Plumbing,Electrical
```

**Query Parameters**:
- `lng` (required): Longitude
- `lat` (required): Latitude
- `maxDistance` (optional): Max distance in meters (default: 10000)
- `skills` (optional): Comma-separated skills

### Update Helper Location
```http
PUT /api/helpers/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "coordinates": [72.8888, 19.0888]
}
```

### Toggle Availability
```http
PUT /api/helpers/availability
Authorization: Bearer <token>
Content-Type: application/json

{
  "availability": true
}
```

### Get Helper's Bookings
```http
GET /api/helpers/bookings
GET /api/helpers/bookings?status=assigned
Authorization: Bearer <token>
```

### Accept Booking
```http
PUT /api/helpers/bookings/:id/accept
Authorization: Bearer <token>
```

### Reject Booking
```http
PUT /api/helpers/bookings/:id/reject
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Not available"
}
```

---

## Socket.IO Events

### Client → Server

**Helper Events**:
- `helper:connect` - `{ helperId }`
- `helper:location-update` - `{ helperId, coordinates: [lng, lat] }`
- `helper:disconnect` - `{ helperId }`

**Booking Events**:
- `booking:accept` - `{ bookingId, helperId }`
- `booking:reject` - `{ bookingId, helperId, reason }`
- `booking:status` - `{ bookingId, helperId, status }`

### Server → Client

**User Events**:
- `helper_assigned` - Helper assigned to booking
- `helper_reassigned` - New helper after rejection
- `booking:status` - Booking status update
- `booking_accepted` - Helper accepted booking
- `booking_failed` - Max rejections reached

**Helper Events**:
- `booking:new` - New booking assigned (30s timeout)
- `booking:timeout` - Request timed out
- `helper:connected` - Successfully connected
- `helper:location-updated` - Location updated

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "message": "Error description"
}
```

**Common Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error
