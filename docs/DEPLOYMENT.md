# Deployment Guide

Complete step-by-step guide to deploy the Smart Helper Auto-Assignment System to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Cloud Platform Deployment](#cloud-platform-deployment)
- [Post-Deployment](#post-deployment)

---

## Prerequisites

### Required Software

- **Node.js** 18+ and npm
- **MongoDB** 7.0+ or MongoDB Atlas account
- **Git**
- **PM2** (for process management)
- **Nginx** (for reverse proxy)
- **Docker** & Docker Compose (optional)

### Required Accounts

- MongoDB Atlas account (or local MongoDB)
- Twilio account (for SMS notifications)
- Email service account (Gmail/SendGrid)
- Domain name (for production)
- SSL certificate (Let's Encrypt recommended)

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/kapiilgupta/Smart-helper-auto-assignment-system-with-AI-chatbot.git
cd Smart-helper-auto-assignment-system-with-AI-chatbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart-helper
JWT_SECRET=your-development-secret
SESSION_SECRET=your-session-secret
```

### 4. Start MongoDB

```bash
# macOS/Linux
mongod

# Windows
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

# Or use MongoDB Atlas (see MONGODB_ATLAS_SETUP.md)
```

### 5. Seed Database

```bash
npm run seed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Production Deployment

### Step 1: Server Setup

**1.1 Update System**

```bash
sudo apt update
sudo apt upgrade -y
```

**1.2 Install Node.js**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

**1.3 Install MongoDB** (if not using Atlas)

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**1.4 Install PM2**

```bash
sudo npm install -g pm2
```

**1.5 Install Nginx**

```bash
sudo apt install -y nginx
```

### Step 2: Application Setup

**2.1 Create Deployment User**

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
su - deploy
```

**2.2 Clone Repository**

```bash
cd /var/www
git clone https://github.com/kapiilgupta/Smart-helper-auto-assignment-system-with-AI-chatbot.git smart-helper
cd smart-helper
```

**2.3 Install Dependencies**

```bash
npm ci --only=production
```

**2.4 Configure Environment**

```bash
cp .env.production.example .env.production
nano .env.production
```

Update with production values:

```env
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smart-helper

# Security (generate with: openssl rand -base64 32)
JWT_SECRET=<your-secure-jwt-secret>
SESSION_SECRET=<your-secure-session-secret>

# Twilio
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_PHONE_NUMBER=<your-phone-number>

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=<your-email>
EMAIL_PASSWORD=<your-app-password>
```

### Step 3: PM2 Setup

**3.1 Start Application**

```bash
pm2 start ecosystem.config.js --env production
```

**3.2 Configure Auto-Start**

```bash
pm2 save
pm2 startup
# Run the command that PM2 outputs
```

**3.3 Monitor Application**

```bash
pm2 monit
pm2 logs
pm2 status
```

### Step 4: Nginx Configuration

**4.1 Create Nginx Config**

```bash
sudo nano /etc/nginx/sites-available/smart-helper
```

Add configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

**4.2 Enable Site**

```bash
sudo ln -s /etc/nginx/sites-available/smart-helper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: SSL/TLS Setup

**5.1 Install Certbot**

```bash
sudo apt install -y certbot python3-certbot-nginx
```

**5.2 Obtain Certificate**

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**5.3 Test Auto-Renewal**

```bash
sudo certbot renew --dry-run
```

### Step 6: Firewall Configuration

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 7: Database Setup

See [MONGODB_ATLAS_SETUP.md](../MONGODB_ATLAS_SETUP.md) for MongoDB Atlas configuration.

**Create Indexes:**

```bash
mongo
use smart-helper
db.users.createIndex({ location: "2dsphere" })
db.users.createIndex({ email: 1 }, { unique: true })
db.bookings.createIndex({ userId: 1 })
db.bookings.createIndex({ helperId: 1 })
db.bookings.createIndex({ status: 1 })
```

---

## Docker Deployment

### Step 1: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Step 2: Install Docker Compose

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 3: Configure Environment

```bash
cp .env.production.example .env.production
# Edit .env.production with your values
```

### Step 4: Build and Start

```bash
docker-compose up -d
```

### Step 5: View Logs

```bash
docker-compose logs -f
```

### Step 6: Stop Services

```bash
docker-compose down
```

---

## Cloud Platform Deployment

### AWS EC2

**1. Launch EC2 Instance**
- AMI: Ubuntu 22.04 LTS
- Instance Type: t3.medium (minimum)
- Security Group: Allow ports 22, 80, 443

**2. Connect to Instance**

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

**3. Follow Production Deployment Steps**

### DigitalOcean Droplet

**1. Create Droplet**
- Distribution: Ubuntu 22.04
- Plan: Basic ($12/month minimum)
- Add SSH key

**2. Connect**

```bash
ssh root@your-droplet-ip
```

**3. Follow Production Deployment Steps**

### Heroku

**1. Install Heroku CLI**

```bash
npm install -g heroku
```

**2. Login**

```bash
heroku login
```

**3. Create App**

```bash
heroku create smart-helper-app
```

**4. Add MongoDB Atlas**

```bash
heroku addons:create mongolab
```

**5. Set Environment Variables**

```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
heroku config:set SESSION_SECRET=your-secret
```

**6. Deploy**

```bash
git push heroku main
```

### Google Cloud Platform

**1. Create Project**

```bash
gcloud projects create smart-helper-project
gcloud config set project smart-helper-project
```

**2. Deploy to Cloud Run**

```bash
gcloud run deploy smart-helper \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Post-Deployment

### 1. Verify Deployment

**Check Application**

```bash
curl https://yourdomain.com/health
```

Expected response:

```json
{
  "uptime": 123.45,
  "message": "OK",
  "database": "connected"
}
```

**Check SSL**

```bash
curl -I https://yourdomain.com
```

### 2. Monitor Application

**PM2 Monitoring**

```bash
pm2 monit
pm2 logs --lines 100
```

**Nginx Logs**

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**Application Logs**

```bash
tail -f logs/app.log
```

### 3. Performance Testing

**Load Test**

```bash
npm install -g artillery
artillery quick --count 100 --num 10 https://yourdomain.com
```

### 4. Backup Configuration

**MongoDB Backup**

```bash
mongodump --uri="mongodb+srv://..." --out=/backup/$(date +%Y%m%d)
```

**Application Backup**

```bash
tar -czf smart-helper-backup-$(date +%Y%m%d).tar.gz /var/www/smart-helper
```

### 5. Set Up Monitoring

**Install Monitoring Tools**

```bash
# PM2 Plus (optional)
pm2 link <secret> <public>

# New Relic (optional)
npm install newrelic
```

---

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/smart-helper
            git pull origin main
            npm ci --only=production
            pm2 restart smart-helper
```

---

## Rollback Procedure

### PM2 Rollback

```bash
cd /var/www/smart-helper
git log --oneline -n 5
git checkout <previous-commit-hash>
npm ci --only=production
pm2 restart smart-helper
```

### Docker Rollback

```bash
docker-compose down
git checkout <previous-commit-hash>
docker-compose up -d
```

---

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

---

## Security Checklist

- [ ] Environment variables configured
- [ ] Strong JWT and session secrets
- [ ] SSL/TLS certificate installed
- [ ] Firewall configured
- [ ] MongoDB authentication enabled
- [ ] Regular backups scheduled
- [ ] Monitoring tools installed
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Dependencies updated

---

## Maintenance

### Regular Tasks

**Daily:**
- Check application logs
- Monitor error rates
- Verify backups

**Weekly:**
- Review performance metrics
- Check disk space
- Update dependencies

**Monthly:**
- Security audit
- Database optimization
- SSL certificate renewal check

---

## Support

For deployment issues:
- Email: support@smarthelper.com
- GitHub Issues: [Open Issue](https://github.com/kapiilgupta/Smart-helper-auto-assignment-system-with-AI-chatbot/issues)
