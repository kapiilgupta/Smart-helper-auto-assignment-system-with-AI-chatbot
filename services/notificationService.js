/**
 * Notification Service
 * Handles SMS, Email, and In-App notifications
 */

const twilio = require('twilio');
const nodemailer = require('nodemailer');

// Twilio Configuration
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

// Email Configuration
const emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * SMS Notification Templates
 */
const smsTemplates = {
    bookingConfirmation: (booking) =>
        `Smart Helper: Your booking for ${booking.serviceId.name} has been confirmed. Booking ID: ${booking._id.toString().substring(0, 8)}. We're finding a helper for you!`,

    helperAssigned: (booking, helper) =>
        `Smart Helper: ${helper.name} has been assigned to your booking! They will arrive in approximately ${booking.estimatedArrival || 15} minutes. Contact: ${helper.phone || 'N/A'}`,

    helperArriving: (booking, helper) =>
        `Smart Helper: ${helper.name} is arriving soon! They are just a few minutes away. Please be ready.`,

    bookingCompleted: (booking) =>
        `Smart Helper: Your booking for ${booking.serviceId.name} has been completed. Thank you for using our service! Amount: ₹${booking.serviceId.basePrice}`,

    bookingCancelled: (booking) =>
        `Smart Helper: Your booking has been cancelled. If you didn't request this, please contact support.`,

    helperNewBooking: (booking, user) =>
        `Smart Helper: New booking request from ${user.name}! Service: ${booking.serviceId.name}. Location: ${booking.location.address.city}. You have 30 seconds to respond.`,

    bookingRejected: (booking) =>
        `Smart Helper: We're finding another helper for your booking. Please wait while we assign someone else.`
};

/**
 * Email Templates
 */
const emailTemplates = {
    bookingReceipt: (booking, user) => ({
        subject: `Booking Receipt - ${booking.serviceId.name}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
                    .content { background: #f9f9f9; padding: 20px; }
                    .receipt-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #ddd; }
                    .total { font-size: 1.2em; font-weight: bold; margin-top: 20px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Smart Helper</h1>
                        <p>Booking Receipt</p>
                    </div>
                    <div class="content">
                        <h2>Thank you for your booking!</h2>
                        <p>Dear ${user.name},</p>
                        <p>Your booking has been completed successfully.</p>
                        
                        <h3>Booking Details</h3>
                        <div class="receipt-item">
                            <span>Booking ID:</span>
                            <span>${booking._id}</span>
                        </div>
                        <div class="receipt-item">
                            <span>Service:</span>
                            <span>${booking.serviceId.name}</span>
                        </div>
                        <div class="receipt-item">
                            <span>Helper:</span>
                            <span>${booking.helperId?.name || 'N/A'}</span>
                        </div>
                        <div class="receipt-item">
                            <span>Date:</span>
                            <span>${new Date(booking.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div class="receipt-item">
                            <span>Location:</span>
                            <span>${booking.location.address.street}, ${booking.location.address.city}</span>
                        </div>
                        <div class="receipt-item total">
                            <span>Total Amount:</span>
                            <span>₹${booking.serviceId.basePrice}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Thank you for using Smart Helper!</p>
                        <p>For support, contact us at support@smarthelper.com</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }),

    welcomeEmail: (user) => ({
        subject: 'Welcome to Smart Helper!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 30px; background: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to Smart Helper!</h1>
                    </div>
                    <div class="content">
                        <h2>Hi ${user.name},</h2>
                        <p>Thank you for joining Smart Helper! We're excited to have you on board.</p>
                        <p>With Smart Helper, you can book household services and get connected with verified helpers in just 15 minutes.</p>
                        <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="button">Get Started</a>
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    })
};

/**
 * Send SMS notification
 */
async function sendSMS(to, message) {
    if (!twilioClient || !TWILIO_PHONE) {
        console.log('[SMS] Twilio not configured. Would send:', message);
        return { success: false, message: 'Twilio not configured' };
    }

    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: TWILIO_PHONE,
            to: to
        });

        console.log('[SMS] Sent successfully:', result.sid);
        return { success: true, sid: result.sid };
    } catch (error) {
        console.error('[SMS] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send Email notification
 */
async function sendEmail(to, subject, html) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log('[Email] Not configured. Would send to:', to);
        return { success: false, message: 'Email not configured' };
    }

    try {
        const info = await emailTransporter.sendMail({
            from: `"Smart Helper" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log('[Email] Sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[Email] Error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send In-App notification via Socket.IO
 */
function sendInAppNotification(io, userId, notification) {
    if (!io) {
        console.log('[In-App] Socket.IO not available');
        return;
    }

    io.to(`user:${userId}`).emit('notification', {
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: new Date()
    });

    console.log('[In-App] Notification sent to user:', userId);
}

/**
 * Notification Service Functions
 */

// Booking Confirmation
async function notifyBookingConfirmation(booking, user, io) {
    const notifications = [];

    // SMS
    if (user.phone) {
        const sms = await sendSMS(user.phone, smsTemplates.bookingConfirmation(booking));
        notifications.push({ type: 'sms', ...sms });
    }

    // In-App
    if (io) {
        sendInAppNotification(io, user._id, {
            type: 'booking_confirmed',
            title: 'Booking Confirmed',
            message: `Your booking for ${booking.serviceId.name} has been confirmed!`,
            data: { bookingId: booking._id }
        });
        notifications.push({ type: 'in-app', success: true });
    }

    return notifications;
}

// Helper Assigned
async function notifyHelperAssigned(booking, user, helper, io) {
    const notifications = [];

    // SMS to User
    if (user.phone) {
        const sms = await sendSMS(user.phone, smsTemplates.helperAssigned(booking, helper));
        notifications.push({ type: 'sms_user', ...sms });
    }

    // SMS to Helper
    if (helper.phone) {
        const sms = await sendSMS(helper.phone, smsTemplates.helperNewBooking(booking, user));
        notifications.push({ type: 'sms_helper', ...sms });
    }

    // In-App to User
    if (io) {
        sendInAppNotification(io, user._id, {
            type: 'helper_assigned',
            title: 'Helper Assigned',
            message: `${helper.name} has been assigned to your booking!`,
            data: { bookingId: booking._id, helperId: helper._id }
        });
        notifications.push({ type: 'in-app', success: true });
    }

    return notifications;
}

// Helper Arriving
async function notifyHelperArriving(booking, user, helper, io) {
    const notifications = [];

    // SMS
    if (user.phone) {
        const sms = await sendSMS(user.phone, smsTemplates.helperArriving(booking, helper));
        notifications.push({ type: 'sms', ...sms });
    }

    // In-App
    if (io) {
        sendInAppNotification(io, user._id, {
            type: 'helper_arriving',
            title: 'Helper Arriving',
            message: `${helper.name} is arriving soon!`,
            data: { bookingId: booking._id }
        });
        notifications.push({ type: 'in-app', success: true });
    }

    return notifications;
}

// Booking Completed
async function notifyBookingCompleted(booking, user, io) {
    const notifications = [];

    // SMS
    if (user.phone) {
        const sms = await sendSMS(user.phone, smsTemplates.bookingCompleted(booking));
        notifications.push({ type: 'sms', ...sms });
    }

    // Email Receipt
    if (user.email) {
        const template = emailTemplates.bookingReceipt(booking, user);
        const email = await sendEmail(user.email, template.subject, template.html);
        notifications.push({ type: 'email', ...email });
    }

    // In-App
    if (io) {
        sendInAppNotification(io, user._id, {
            type: 'booking_completed',
            title: 'Booking Completed',
            message: 'Your booking has been completed successfully!',
            data: { bookingId: booking._id }
        });
        notifications.push({ type: 'in-app', success: true });
    }

    return notifications;
}

// Booking Cancelled
async function notifyBookingCancelled(booking, user, io) {
    const notifications = [];

    // SMS
    if (user.phone) {
        const sms = await sendSMS(user.phone, smsTemplates.bookingCancelled(booking));
        notifications.push({ type: 'sms', ...sms });
    }

    // In-App
    if (io) {
        sendInAppNotification(io, user._id, {
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: 'Your booking has been cancelled.',
            data: { bookingId: booking._id }
        });
        notifications.push({ type: 'in-app', success: true });
    }

    return notifications;
}

// Welcome Email
async function sendWelcomeEmail(user) {
    if (!user.email) return { success: false, message: 'No email provided' };

    const template = emailTemplates.welcomeEmail(user);
    return await sendEmail(user.email, template.subject, template.html);
}

module.exports = {
    // Core functions
    sendSMS,
    sendEmail,
    sendInAppNotification,

    // Notification workflows
    notifyBookingConfirmation,
    notifyHelperAssigned,
    notifyHelperArriving,
    notifyBookingCompleted,
    notifyBookingCancelled,
    sendWelcomeEmail,

    // Templates (for testing/customization)
    smsTemplates,
    emailTemplates
};
