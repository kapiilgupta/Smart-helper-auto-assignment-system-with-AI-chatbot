# SSL/TLS Setup Guide

## Option 1: Let's Encrypt (Free SSL Certificate) - Recommended

### Prerequisites
- Domain name pointed to your server
- Ports 80 and 443 open
- Certbot installed

### Step 1: Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

**CentOS/RHEL:**
```bash
sudo yum install certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
1. Enter email address
2. Agree to Terms of Service
3. Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### Step 3: Verify Certificate

```bash
sudo certbot certificates
```

### Step 4: Auto-Renewal

Certbot automatically sets up auto-renewal. Test it:

```bash
sudo certbot renew --dry-run
```

### Step 5: Update Nginx Configuration

Certbot automatically updates your Nginx config. Verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Option 2: Self-Signed Certificate (Development/Testing Only)

### Generate Self-Signed Certificate

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Update Nginx Configuration

The nginx.conf is already configured to use:
- Certificate: `/etc/nginx/ssl/cert.pem`
- Private Key: `/etc/nginx/ssl/key.pem`

---

## Option 3: Commercial SSL Certificate

### Step 1: Generate CSR (Certificate Signing Request)

```bash
openssl req -new -newkey rsa:2048 -nodes \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/csr.pem
```

### Step 2: Purchase Certificate

1. Buy SSL certificate from provider (DigiCert, Comodo, etc.)
2. Submit the CSR file
3. Complete domain validation
4. Download certificate files

### Step 3: Install Certificate

```bash
# Copy certificate files
cp your-certificate.crt nginx/ssl/cert.pem
cp your-private-key.key nginx/ssl/key.pem

# Set permissions
chmod 600 nginx/ssl/key.pem
chmod 644 nginx/ssl/cert.pem
```

---

## Docker Setup with SSL

### Using Let's Encrypt with Docker

**docker-compose.yml addition:**

```yaml
services:
  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

**Update nginx service:**

```yaml
  nginx:
    volumes:
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
```

### Initial Certificate Obtainment

```bash
docker-compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

---

## SSL Configuration Best Practices

### 1. Strong Cipher Suites

Already configured in nginx.conf:
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
```

### 2. HSTS (HTTP Strict Transport Security)

Already configured:
```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
```

### 3. OCSP Stapling (Optional)

Add to nginx.conf:
```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
```

### 4. Session Resumption

Already configured:
```nginx
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
```

---

## Testing SSL Configuration

### 1. SSL Labs Test

Visit: https://www.ssllabs.com/ssltest/

Enter your domain and run the test. Aim for A+ rating.

### 2. Command Line Test

```bash
# Test SSL connection
openssl s_client -connect yourdomain.com:443

# Check certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Verify certificate chain
openssl s_client -connect yourdomain.com:443 -showcerts
```

### 3. Browser Test

1. Visit https://yourdomain.com
2. Click the padlock icon
3. Verify certificate details

---

## Troubleshooting

### Certificate Not Found

```bash
# Check certificate files exist
ls -la nginx/ssl/

# Verify Nginx can read files
sudo nginx -t
```

### Mixed Content Warnings

Update all HTTP resources to HTTPS in your HTML/CSS/JS files.

### Certificate Expired

```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Reload Nginx
sudo systemctl reload nginx
```

### Port 443 Not Accessible

```bash
# Check firewall
sudo ufw allow 443/tcp

# Or for iptables
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## Monitoring Certificate Expiration

### Set up monitoring script

```bash
#!/bin/bash
# check-ssl-expiry.sh

DOMAIN="yourdomain.com"
DAYS_BEFORE_EXPIRY=30

EXPIRY_DATE=$(echo | openssl s_client -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt $DAYS_BEFORE_EXPIRY ]; then
    echo "SSL certificate expires in $DAYS_LEFT days!"
    # Send alert (email, Slack, etc.)
fi
```

### Add to crontab

```bash
# Run daily at 9 AM
0 9 * * * /path/to/check-ssl-expiry.sh
```

---

## Security Checklist

- [ ] Use TLS 1.2 or higher only
- [ ] Disable weak cipher suites
- [ ] Enable HSTS
- [ ] Implement OCSP stapling
- [ ] Set up auto-renewal
- [ ] Monitor certificate expiration
- [ ] Use strong private key (2048-bit minimum)
- [ ] Protect private key file (chmod 600)
- [ ] Regular security audits
- [ ] Keep Nginx updated
