# System Architecture

Smart Helper Auto-Assignment System - Technical Architecture and Design

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Design](#component-design)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Assignment Algorithm](#assignment-algorithm)
- [Real-Time Communication](#real-time-communication)
- [Security Architecture](#security-architecture)

---

## Overview

The Smart Helper Auto-Assignment System is a location-based, on-demand service platform that connects users with nearby service professionals in real-time, promising service delivery within 15 minutes.

### Key Features

- **Smart Assignment**: AI-powered algorithm assigns nearest available helper
- **Real-Time Tracking**: Live location updates via WebSocket
- **Auto-Reassignment**: Automatic reassignment on rejection or timeout
- **Geofencing**: 10km radius-based matching
- **Multi-Channel Notifications**: SMS, Email, and In-App

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile App]
    end
    
    subgraph "Load Balancer"
        NGINX[Nginx Reverse Proxy]
    end
    
    subgraph "Application Layer"
        APP1[Node.js Instance 1]
        APP2[Node.js Instance 2]
        APP3[Node.js Instance N]
    end
    
    subgraph "Real-Time Layer"
        SOCKET[Socket.IO Server]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB)]
        REDIS[(Redis Cache)]
    end
    
    subgraph "External Services"
        TWILIO[Twilio SMS]
        EMAIL[Email Service]
        MAPS[Maps API]
    end
    
    WEB --> NGINX
    MOBILE --> NGINX
    NGINX --> APP1
    NGINX --> APP2
    NGINX --> APP3
    APP1 --> SOCKET
    APP2 --> SOCKET
    APP3 --> SOCKET
    APP1 --> MONGO
    APP2 --> MONGO
    APP3 --> MONGO
    APP1 --> REDIS
    APP2 --> REDIS
    APP3 --> REDIS
    APP1 --> TWILIO
    APP1 --> EMAIL
    APP1 --> MAPS
```

### Architecture Layers

1. **Client Layer**: Web browsers and mobile applications
2. **Load Balancer**: Nginx for SSL termination and load distribution
3. **Application Layer**: Node.js cluster with PM2 process management
4. **Real-Time Layer**: Socket.IO for WebSocket connections
5. **Data Layer**: MongoDB for persistence, Redis for caching
6. **External Services**: Third-party integrations

---

## Component Design

### 1. Authentication Module

```mermaid
sequenceDiagram
    participant User
    participant API
    participant Auth
    participant DB
    
    User->>API: POST /api/auth/register
    API->>Auth: Validate credentials
    Auth->>DB: Check email exists
    DB-->>Auth: Email available
    Auth->>Auth: Hash password
    Auth->>DB: Create user
    DB-->>Auth: User created
    Auth->>Auth: Generate JWT
    Auth-->>User: Return token + user
```

**Components:**
- Password hashing (bcrypt)
- JWT token generation
- Session management
- Role-based access control

### 2. Assignment Algorithm

```mermaid
flowchart TD
    START[Booking Created] --> FETCH[Fetch Available Helpers]
    FETCH --> GEO[Geospatial Query<br/>10km radius]
    GEO --> FILTER[Filter by Skills]
    FILTER --> EXCLUDE[Exclude Rejected Helpers]
    EXCLUDE --> SORT[Sort by Distance & Rating]
    SORT --> CHECK{Helpers Found?}
    CHECK -->|Yes| ASSIGN[Assign to Closest]
    CHECK -->|No| CANCEL[Cancel Booking]
    ASSIGN --> NOTIFY[Send Notification]
    NOTIFY --> TIMER[Start 30s Timer]
    TIMER --> WAIT{Response?}
    WAIT -->|Accept| SUCCESS[Booking Assigned]
    WAIT -->|Reject| REASSIGN[Reassign to Next]
    WAIT -->|Timeout| REASSIGN
    REASSIGN --> COUNT{Attempts < 3?}
    COUNT -->|Yes| EXCLUDE
    COUNT -->|No| CANCEL
```

**Algorithm Steps:**
1. Fetch available helpers within 10km radius
2. Filter by required skills
3. Exclude previously rejected helpers
4. Sort by distance (primary) and rating (secondary)
5. Assign to closest helper
6. Wait for response (30 seconds)
7. Reassign if rejected or timeout
8. Cancel after 3 failed attempts

### 3. Real-Time Communication

```mermaid
sequenceDiagram
    participant User
    participant Server
    participant Helper
    
    User->>Server: Create Booking
    Server->>Server: Assign Helper
    Server->>Helper: booking:new-request
    Server->>User: booking:created
    
    Helper->>Server: Accept Booking
    Server->>User: booking:helper-assigned
    Server->>Helper: booking:accepted
    
    loop Every 5 seconds
        Helper->>Server: location-update
        Server->>User: helper:location-update
    end
    
    Helper->>Server: Start Job
    Server->>User: booking:in-progress
    
    Helper->>Server: Complete Job
    Server->>User: booking:completed
```

---

## Data Flow

### Booking Creation Flow

```mermaid
flowchart LR
    A[User Creates Booking] --> B[Validate Request]
    B --> C[Save to Database]
    C --> D[Trigger Assignment]
    D --> E[Find Helpers]
    E --> F[Assign Helper]
    F --> G[Send Notifications]
    G --> H[Update UI via Socket.IO]
```

### Helper Assignment Flow

```mermaid
flowchart TD
    A[Assignment Triggered] --> B{Available Helpers?}
    B -->|Yes| C[Calculate Distances]
    B -->|No| D[Queue Booking]
    C --> E[Sort by Distance]
    E --> F[Check Availability]
    F --> G[Assign to Helper]
    G --> H[Send Notification]
    H --> I{Response in 30s?}
    I -->|Accept| J[Booking Confirmed]
    I -->|Reject| K[Reassign]
    I -->|Timeout| K
    K --> L{Attempts < 3?}
    L -->|Yes| C
    L -->|No| M[Cancel Booking]
```

---

## Database Schema

### Collections

**1. Users**
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: String (enum: ['user', 'helper', 'admin']),
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  skills: [String], // For helpers
  rating: Number,
  availability: Boolean, // For helpers
  createdAt: Date
}
```

**Indexes:**
- `email` (unique)
- `location` (2dsphere)
- `role`

**2. Services**
```javascript
{
  _id: ObjectId,
  name: String,
  category: String,
  description: String,
  basePrice: Number,
  estimatedDuration: Number,
  icon: String
}
```

**3. Bookings**
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User'),
  serviceId: ObjectId (ref: 'Service'),
  helperId: ObjectId (ref: 'User'),
  status: String (enum: ['pending', 'assigned', 'in-progress', 'completed', 'cancelled']),
  location: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  scheduledTime: Date,
  assignedAt: Date,
  completedAt: Date,
  rejectedHelpers: [ObjectId],
  rejectionCount: Number,
  notes: String,
  createdAt: Date
}
```

**Indexes:**
- `userId`
- `helperId`
- `status`
- `createdAt`

---

## Assignment Algorithm

### Distance Calculation (Haversine Formula)

```javascript
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(point1.latitude)) * 
            Math.cos(toRad(point2.latitude)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

### Geospatial Query

```javascript
const helpers = await User.find({
  role: 'helper',
  availability: true,
  skills: serviceCategory,
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [userLongitude, userLatitude]
      },
      $maxDistance: 10000 // 10km in meters
    }
  }
});
```

### Scoring Algorithm

```javascript
function scoreHelper(helper, userLocation) {
  const distance = calculateDistance(userLocation, helper.location);
  const distanceScore = 1 / (1 + distance); // Closer = higher score
  const ratingScore = helper.rating / 5; // Normalize to 0-1
  
  // Weighted score: 70% distance, 30% rating
  return (distanceScore * 0.7) + (ratingScore * 0.3);
}
```

---

## Real-Time Communication

### Socket.IO Architecture

```mermaid
graph LR
    A[Client] -->|Connect| B[Socket.IO Server]
    B -->|Join Room| C[User Room]
    B -->|Join Room| D[Booking Room]
    E[Event] -->|Emit| B
    B -->|Broadcast| C
    B -->|Broadcast| D
```

### Event Types

**Client → Server:**
- `join` - Join user/helper room
- `location-update` - Update helper location
- `typing` - Chat typing indicator

**Server → Client:**
- `booking:created` - New booking created
- `booking:helper-assigned` - Helper assigned
- `booking:status-update` - Status changed
- `helper:location-update` - Helper location updated
- `notification` - General notification

---

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant DB
    
    Client->>API: Login Request
    API->>Auth: Validate Credentials
    Auth->>DB: Query User
    DB-->>Auth: User Data
    Auth->>Auth: Compare Password
    Auth->>Auth: Generate JWT
    Auth-->>Client: JWT Token
    
    Client->>API: API Request + JWT
    API->>Auth: Verify JWT
    Auth-->>API: User ID
    API->>DB: Fetch Data
    DB-->>API: Response
    API-->>Client: Protected Data
```

### Security Measures

1. **Password Security**
   - bcrypt hashing (10 rounds)
   - Minimum 6 characters
   - No plain text storage

2. **JWT Tokens**
   - HS256 algorithm
   - 24-hour expiration
   - Secure secret key

3. **API Security**
   - Rate limiting (100 req/15min)
   - CORS configuration
   - Input validation
   - SQL injection prevention

4. **Transport Security**
   - HTTPS/TLS 1.2+
   - Secure WebSocket (wss://)
   - Security headers (HSTS, CSP, etc.)

---

## Performance Optimization

### Caching Strategy

```mermaid
flowchart LR
    A[Request] --> B{Cache Hit?}
    B -->|Yes| C[Return Cached]
    B -->|No| D[Query Database]
    D --> E[Cache Result]
    E --> F[Return Data]
```

**Cached Data:**
- Service listings (1 hour TTL)
- Helper profiles (15 minutes TTL)
- User sessions (24 hours TTL)

### Database Optimization

- **Indexes**: Geospatial, email, status
- **Connection Pooling**: Max 10 connections
- **Query Optimization**: Projection, lean queries
- **Aggregation Pipeline**: For analytics

---

## Scalability

### Horizontal Scaling

```mermaid
graph TB
    LB[Load Balancer]
    LB --> A1[App Instance 1]
    LB --> A2[App Instance 2]
    LB --> A3[App Instance 3]
    A1 --> DB[(MongoDB Cluster)]
    A2 --> DB
    A3 --> DB
    A1 --> R[(Redis)]
    A2 --> R
    A3 --> R
```

**Scaling Strategy:**
- PM2 cluster mode (CPU cores)
- Docker container orchestration
- MongoDB replica sets
- Redis for session sharing

---

## Monitoring & Logging

### Metrics Tracked

- Request latency
- Error rates
- Database query performance
- Socket.IO connections
- Memory usage
- CPU utilization

### Logging Levels

- **ERROR**: Critical failures
- **WARN**: Potential issues
- **INFO**: General information
- **DEBUG**: Detailed debugging

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | EJS, Bootstrap 5, Leaflet.js |
| Backend | Node.js, Express.js |
| Database | MongoDB 7.0 |
| Cache | Redis 7 |
| Real-Time | Socket.IO 4.8 |
| Authentication | JWT, bcrypt |
| Notifications | Twilio, Nodemailer |
| Deployment | Docker, PM2, Nginx |
| Testing | Jest, Supertest |

---

## Future Enhancements

1. **Machine Learning**
   - Demand prediction
   - Dynamic pricing
   - Helper performance analysis

2. **Advanced Features**
   - Multi-language support
   - Payment gateway integration
   - Advanced analytics dashboard
   - Mobile app (React Native)

3. **Infrastructure**
   - Kubernetes orchestration
   - Microservices architecture
   - GraphQL API
   - CDN integration
