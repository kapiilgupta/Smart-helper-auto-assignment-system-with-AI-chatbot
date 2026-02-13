# MongoDB Setup Instructions

## The Issue
The seed script is failing because MongoDB is not installed or running on your system.

Error: `MongooseServerSelectionError: connect ECONNREFUSED ::1:27017`

## Solution Options

### Option 1: Install MongoDB Locally (Recommended for Development)

1. **Download MongoDB Community Server**:
   - Visit: https://www.mongodb.com/try/download/community
   - Download the Windows installer (.msi)
   - Install with default settings

2. **Start MongoDB**:
   ```bash
   # MongoDB should start automatically as a Windows service
   # To verify it's running:
   net start MongoDB
   ```

3. **Run the seed script**:
   ```bash
   npm run seed
   ```

### Option 2: Use MongoDB Atlas (Cloud Database - Free Tier Available)

1. **Create a free account**:
   - Visit: https://www.mongodb.com/cloud/atlas/register
   - Create a free M0 cluster

2. **Get your connection string**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string

3. **Update your .env file**:
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-helper?retryWrites=true&w=majority
   ```
   Replace `username`, `password`, and `cluster` with your actual values

4. **Run the seed script**:
   ```bash
   npm run seed
   ```

### Option 3: Use Docker (If you have Docker installed)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
npm run seed
```

## Verify MongoDB is Running

After installation, verify MongoDB is accessible:

```bash
# Try connecting with mongosh (MongoDB Shell)
mongosh

# Or check if the port is listening
netstat -an | findstr "27017"
```

## Current Configuration

Your `.env` file is set to:
```
MONGO_URI=mongodb://localhost:27017/smart-helper
```

This expects MongoDB to be running locally on port 27017.
