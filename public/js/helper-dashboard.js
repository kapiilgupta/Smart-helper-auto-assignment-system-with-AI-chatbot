/**
 * Helper Dashboard Client-Side JavaScript
 * Features: Location Tracking, Socket.IO, Notifications, Booking Management
 */

class HelperDashboardManager {
    constructor() {
        this.socket = null;
        this.locationTracker = null;
        this.countdownTimer = null;
        this.currentRequest = null;
        this.isOnline = navigator.onLine;

        this.init();
    }

    /**
     * Initialize the dashboard manager
     */
    init() {
        this.initSocketIO();
        this.setupEventListeners();
        this.detectOnlineStatus();
        this.requestNotificationPermission();
    }

    /**
     * Initialize Socket.IO connection
     */
    initSocketIO() {
        this.socket = io();

        const helperId = this.getHelperId();
        if (helperId) {
            this.socket.emit('join', { userId: helperId, role: 'helper' });
        }

        // Socket event listeners
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showNotification('Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showNotification('Connection lost. Reconnecting...', 'warning');
        });

        this.socket.on('booking:new', (data) => {
            console.log('New booking request:', data);
            this.handleNewBooking(data);
        });

        this.socket.on('booking:timeout', (data) => {
            console.log('Booking timeout:', data);
            this.handleBookingTimeout(data);
        });

        this.socket.on('booking:cancelled', (data) => {
            console.log('Booking cancelled:', data);
            this.showNotification('Booking was cancelled by user', 'info');
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Availability toggle
        const availToggle = document.getElementById('availabilityToggle');
        if (availToggle) {
            availToggle.addEventListener('change', (e) => this.toggleAvailability(e.target.checked));
        }
    }

    /**
     * Start background location tracking
     */
    startLocationTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation not supported');
            return;
        }

        // Initial location update
        this.updateLocation();

        // Update every 10 seconds
        this.locationTracker = setInterval(() => {
            this.updateLocation();
        }, 10000);
    }

    /**
     * Stop location tracking
     */
    stopLocationTracking() {
        if (this.locationTracker) {
            clearInterval(this.locationTracker);
            this.locationTracker = null;
        }
    }

    /**
     * Update current location
     */
    updateLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Emit location update via Socket.IO
                this.socket.emit('helper:location-update', {
                    helperId: this.getHelperId(),
                    coordinates: [longitude, latitude]
                });

                console.log('Location updated:', latitude, longitude);
            },
            (error) => {
                console.error('Location error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }

    /**
     * Toggle availability status
     */
    async toggleAvailability(isAvailable) {
        try {
            const response = await fetch('/api/helpers/availability', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getAuthToken()
                },
                body: JSON.stringify({ availability: isAvailable })
            });

            if (response.ok) {
                const statusText = document.getElementById('statusText');
                if (statusText) {
                    statusText.textContent = isAvailable ? 'Online' : 'Offline';
                    statusText.className = isAvailable ? 'text-success mb-0' : 'text-muted mb-0';
                }

                if (isAvailable) {
                    this.startLocationTracking();
                    this.socket.emit('helper:connect', { helperId: this.getHelperId() });
                    this.showNotification('You are now online and available', 'success');
                } else {
                    this.stopLocationTracking();
                    this.socket.emit('helper:disconnect', { helperId: this.getHelperId() });
                    this.showNotification('You are now offline', 'info');
                }
            } else {
                throw new Error('Failed to update availability');
            }
        } catch (error) {
            console.error('Error toggling availability:', error);
            this.showNotification('Failed to update availability', 'error');

            // Revert toggle
            const toggle = document.getElementById('availabilityToggle');
            if (toggle) toggle.checked = !isAvailable;
        }
    }

    /**
     * Handle new booking request
     */
    handleNewBooking(data) {
        this.currentRequest = data;

        // Play sound alert
        this.playNotificationSound();

        // Show browser notification
        this.showBrowserNotification('New Booking Request',
            `${data.booking.serviceId.name} - ${data.booking.location.address.city}`);

        // Display in UI
        this.displayBookingRequest(data);

        // Start countdown
        this.startCountdown(30);
    }

    /**
     * Display booking request in UI
     */
    displayBookingRequest(data) {
        const card = document.getElementById('incomingRequestsCard');
        const content = document.getElementById('incomingRequestContent');

        if (!card || !content) return;

        const booking = data.booking;

        content.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h5>${booking.serviceId.name}</h5>
                    <p class="mb-2"><i class="bi bi-person me-2"></i>${booking.userId.name}</p>
                    <p class="mb-2"><i class="bi bi-geo-alt me-2"></i>${booking.location.address.street}, ${booking.location.address.city}</p>
                    <p class="mb-2"><i class="bi bi-clock me-2"></i>Estimated: ${booking.serviceId.estimatedDuration} min</p>
                    <p class="mb-0"><i class="bi bi-currency-rupee me-2"></i>₹${booking.serviceId.basePrice}</p>
                </div>
                <div class="col-md-4 text-center">
                    <div class="mb-3">
                        <div class="circular-progress mb-2"></div>
                        <h4 id="countdown">30</h4>
                        <small class="text-muted">seconds to respond</small>
                    </div>
                    <button class="btn btn-success w-100 mb-2" onclick="helperManager.acceptBooking('${booking._id}')">
                        <i class="bi bi-check-circle me-2"></i>Accept
                    </button>
                    <button class="btn btn-outline-danger w-100" onclick="helperManager.rejectBooking('${booking._id}')">
                        <i class="bi bi-x-circle me-2"></i>Reject
                    </button>
                </div>
            </div>
        `;

        card.style.display = 'block';
    }

    /**
     * Start countdown timer
     */
    startCountdown(seconds) {
        let timeLeft = seconds;
        const countdownEl = document.getElementById('countdown');

        this.countdownTimer = setInterval(() => {
            timeLeft--;
            if (countdownEl) {
                countdownEl.textContent = timeLeft;
            }

            if (timeLeft <= 0) {
                this.stopCountdown();
                this.handleBookingTimeout();
            }
        }, 1000);
    }

    /**
     * Stop countdown timer
     */
    stopCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    /**
     * Accept booking
     */
    async acceptBooking(bookingId) {
        try {
            const response = await fetch(`/api/helpers/bookings/${bookingId}/accept`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + this.getAuthToken()
                }
            });

            if (response.ok) {
                this.stopCountdown();
                this.hideBookingRequest();

                this.socket.emit('booking:accept', {
                    bookingId,
                    helperId: this.getHelperId()
                });

                this.showNotification('Booking accepted!', 'success');

                // Redirect to active booking page
                setTimeout(() => {
                    window.location.href = `/helper/booking/${bookingId}`;
                }, 1000);
            } else {
                throw new Error('Failed to accept booking');
            }
        } catch (error) {
            console.error('Error accepting booking:', error);
            this.showNotification('Failed to accept booking', 'error');
        }
    }

    /**
     * Reject booking
     */
    async rejectBooking(bookingId) {
        const reason = prompt('Reason for rejection (optional):');

        try {
            const response = await fetch(`/api/helpers/bookings/${bookingId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getAuthToken()
                },
                body: JSON.stringify({ reason: reason || 'Helper rejected' })
            });

            if (response.ok) {
                this.stopCountdown();
                this.hideBookingRequest();

                this.socket.emit('booking:reject', {
                    bookingId,
                    helperId: this.getHelperId(),
                    reason
                });

                this.showNotification('Booking rejected', 'info');
            } else {
                throw new Error('Failed to reject booking');
            }
        } catch (error) {
            console.error('Error rejecting booking:', error);
            this.showNotification('Failed to reject booking', 'error');
        }
    }

    /**
     * Handle booking timeout
     */
    handleBookingTimeout() {
        this.hideBookingRequest();
        this.showNotification('Booking request expired', 'warning');
    }

    /**
     * Hide booking request
     */
    hideBookingRequest() {
        const card = document.getElementById('incomingRequestsCard');
        if (card) {
            card.style.display = 'none';
        }
        this.currentRequest = null;
    }

    /**
     * Navigate to user location
     */
    navigateToLocation(lat, lng) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    }

    /**
     * Update job status
     */
    async updateJobStatus(bookingId, status) {
        try {
            const response = await fetch(`/api/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getAuthToken()
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                this.showNotification(`Job ${status}`, 'success');
                this.socket.emit('booking:status', { bookingId, status });
                return true;
            } else {
                throw new Error('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            this.showNotification('Failed to update job status', 'error');
            return false;
        }
    }

    /**
     * Play notification sound
     */
    playNotificationSound() {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKnk77RgGwU7k9n0yXkpBSh+zPLaizsKGGS56+mmUhQKQ5zd8sFuIAUsgs/z2Ik3CBtpvfDknE4MDlCp5O+0YBsFO5PZ9Ml5KQUofszy2os7ChhluevrplIUCkOc3fLBbiAFLILP89iJNwgbaL3w5JxODA5QqeTvtGAbBTuT2fTJeSkFKH7M8tqLOwoYZbnr66ZSFApDnN3ywW4gBSyCz/PYiTcIG2i98OScTgwOUKnk77RgGwU7k9n0yXkpBSh+zPLaizsKGGW56+umUhQKQ5zd8sFuIAUsgs/z2Ik3CBtovfDknE4MDlCp5O+0YBsFO5PZ9Ml5KQUofszy2os7ChhluevrplIUCkOc3fLBbiAFLILP89iJNwgbaL3w5JxODA5QqeTvtGAbBTuT2fTJeSkFKH7M8tqLOwoYZbnr66ZSFApDnN3ywW4gBSyCz/PYiTcIG2i98OScTgwOUKnk77RgGwU7k9n0yXkpBSh+zPLaizsKGGW56+umUhQKQ5zd8sFuIAUsgs/z2Ik3CBtovfDknE4MDlCp5O+0YBsFO5PZ9Ml5KQUofszy2os7ChhluevrplIUCkOc3fLBbiAFLILP89iJNwgbaL3w5JxODA5QqeTvtGAbBTuT2fTJeSkFKH7M8tqLOwoYZbnr66ZSFApDnN3ywW4gBSyCz/PYiTcIG2i98OScTgwOUKnk77RgGwU7k9n0yXkpBSh+zPLaizsKGGW56+umUhQKQ5zd8sFuIAUsgs/z2Ik3CBtovfDknE4MDlCp5O+0YBsFO5PZ9Ml5KQUofszy2os7ChhluevrplIUCkOc3fLBbiAFLILP89iJNwgbaL3w5JxODA5QqeTvtGAbBTuT2fTJeSkFKH7M8tqLOwoYZbnr66ZSFApDnN3ywW4gBSyCz/PYiTcIG2i98OScTgwOUKnk77RgGwU7k9n0yXkpBSh+zPLaizsKGGW56+umUhQKQ5zd8sFuIAUsgs/z2Ik3CBtovfDknE4MDlCp5O+0YBsFO5PZ9Ml5KQUofszy2os7ChhluevrplIUCkOc3fLBbiAFLILP89iJNwgbaL3w5JxODA5QqeTvtGAbBTuT2fTJeSkFKH7M8tqLOwoYZbnr66ZSFApDnN3ywW4gBSyCz/PYiTcIG2i98OScTgwOUKnk77RgGwU7k9n0yXkpBSh+zPLaizsKGGW56+umUhQKQ5zd8sFuIAU=');
        audio.play().catch(e => console.log('Could not play sound:', e));
    }

    /**
     * Request notification permission
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico'
            });
        }
    }

    /**
     * Detect online/offline status
     */
    detectOnlineStatus() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('You are offline', 'warning');
            this.stopLocationTracking();
        });
    }

    /**
     * Show notification toast
     */
    showNotification(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Get helper ID
     */
    getHelperId() {
        const userMeta = document.querySelector('meta[name="user-id"]');
        return userMeta?.content || null;
    }

    /**
     * Get auth token
     */
    getAuthToken() {
        return localStorage.getItem('token') || '';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.helperManager = new HelperDashboardManager();
});
