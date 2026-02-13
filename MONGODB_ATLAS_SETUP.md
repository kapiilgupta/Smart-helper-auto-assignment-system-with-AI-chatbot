# MongoDB Atlas Setup Guide

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new project named "Smart Helper"

## Step 2: Create a Cluster

1. Click "Build a Cluster"
2. Choose **FREE** tier (M0 Sandbox)
3. Select your preferred cloud provider and region
4. Click "Create Cluster" (takes 3-5 minutes)

## Step 3: Configure Database Access

1. Go to **Database Access** in the left sidebar
2. Click "Add New Database User"
3. Choose authentication method: **Password**
4. Username: `smart-helper-admin`
5. Password: Generate a secure password (save it!)
6. Database User Privileges: **Atlas admin**
7. Click "Add User"

## Step 4: Configure Network Access

1. Go to **Network Access** in the left sidebar
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's IP address
5. Click "Confirm"

## Step 5: Get Connection String

1. Go to **Clusters** and click "Connect"
2. Choose "Connect your application"
3. Driver: **Node.js**
4. Version: **4.1 or later**
5. Copy the connection string

Example:
```
mongodb+srv://smart-helper-admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## Step 6: Update Environment Variables

1. Replace `<password>` with your database user password
2. Add database name: `/smart-helper`
3. Update `.env.production`:

```env
MONGODB_URI=mongodb+srv://smart-helper-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/smart-helper?retryWrites=true&w=majority
```

## Step 7: Create Database and Collections

MongoDB Atlas will automatically create the database and collections when your application first connects.

Alternatively, you can create them manually:

1. Go to **Clusters** → **Collections**
2. Click "Create Database"
3. Database name: `smart-helper`
4. Collection name: `users`
5. Click "Create"

## Step 8: Create Indexes

Run these commands in the MongoDB Shell (Clusters → Connect → MongoDB Shell):

```javascript
use smart-helper

// User location index
db.users.createIndex({ location: "2dsphere" })

// User email index
db.users.createIndex({ email: 1 }, { unique: true })

// Booking indexes
db.bookings.createIndex({ userId: 1 })
db.bookings.createIndex({ helperId: 1 })
db.bookings.createIndex({ status: 1 })
db.bookings.createIndex({ createdAt: -1 })

// Service index
db.services.createIndex({ category: 1 })
```

## Step 9: Test Connection

Run your application locally with the new connection string:

```bash
npm start
```

Check the console for successful connection message.

## Security Best Practices

1. **Never commit credentials** - Use environment variables
2. **Rotate passwords** - Change database passwords regularly
3. **Limit IP access** - Only allow specific IPs in production
4. **Use least privilege** - Create separate users for different environments
5. **Enable audit logs** - Monitor database access
6. **Backup regularly** - Enable automated backups in Atlas

## Monitoring

1. Go to **Metrics** in MongoDB Atlas
2. Monitor:
   - Connections
   - Operations per second
   - Network traffic
   - Storage usage

## Backup Configuration

1. Go to **Backup** tab
2. Enable **Continuous Backup** (paid feature)
3. Or use **Cloud Provider Snapshots** (free tier)

## Connection Pooling

Your application automatically handles connection pooling. Default settings:

```javascript
{
  maxPoolSize: 10,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}
```

## Troubleshooting

**Connection timeout:**
- Check IP whitelist
- Verify credentials
- Check network connectivity

**Authentication failed:**
- Verify username and password
- Check database user permissions

**Database not found:**
- Database is created automatically on first write
- Or create manually in Atlas UI
