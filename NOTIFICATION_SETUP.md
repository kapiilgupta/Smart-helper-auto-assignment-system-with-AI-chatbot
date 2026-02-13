# Notification System Configuration

## Overview
The notification system supports three types of notifications:
1. **SMS** - via Twilio
2. **Email** - via Nodemailer
3. **In-App** - via Socket.IO

## Setup Instructions

### 1. Twilio SMS Configuration

1. Create a Twilio account at [https://www.twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Get a Twilio phone number
4. Update `.env` file:
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

### 2. Email Configuration (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App-Specific Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password
3. Update `.env` file:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
```

**Alternative Email Services:**
- Outlook: `EMAIL_SERVICE=outlook`
- Yahoo: `EMAIL_SERVICE=yahoo`
- SendGrid: `EMAIL_SERVICE=sendgrid`

### 3. Socket.IO (Already Configured)
Socket.IO is already integrated in `server.js` and `config/socket.js`.

## Notification Types

### SMS Notifications
- Booking confirmation
- Helper assigned
- Helper arriving
- Booking completed
- Booking cancelled
- Helper new booking request

### Email Notifications
- Booking receipt (HTML template)
- Welcome email (HTML template)

### In-App Notifications
- Real-time notifications via Socket.IO
- Displayed as toast notifications
- Event types:
  - `booking_confirmed`
  - `helper_assigned`
  - `helper_arriving`
  - `booking_completed`
  - `booking_cancelled`

## Usage Example

```javascript
const notificationService = require('./services/notificationService');

// Send booking confirmation
await notificationService.notifyBookingConfirmation(booking, user, io);

// Send helper assigned notification
await notificationService.notifyHelperAssigned(booking, user, helper, io);

// Send completion notification with receipt
await notificationService.notifyBookingCompleted(booking, user, io);
```

## Testing Without Credentials

If Twilio or Email credentials are not configured, the service will log the notifications to console instead of sending them. This allows development without actual SMS/Email services.

## Dependencies

```bash
npm install twilio nodemailer
```

## Environment Variables

All notification-related environment variables:
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio Phone Number
- `EMAIL_SERVICE` - Email service provider (gmail, outlook, etc.)
- `EMAIL_USER` - Email address
- `EMAIL_PASSWORD` - Email password or app-specific password
- `APP_URL` - Application URL for email links

## Security Notes

1. Never commit `.env` file to version control
2. Use app-specific passwords for email
3. Rotate Twilio credentials regularly
4. Keep auth tokens secure
