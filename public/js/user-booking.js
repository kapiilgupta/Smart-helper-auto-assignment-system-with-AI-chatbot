/**
 * User Booking Client-Side JavaScript
 * Features: Geolocation, Maps, Socket.IO, Real-time Updates
 */

class UserBookingManager {
    constructor() {
        this.socket = null;
        this.map = null;
        this.userMarker = null;
        this.helperMarker = null;
        this.currentBooking = null;
        this.countdownTimer = null;

        this.init();
    }

    /**
     * Initialize the booking manager
     */
    init() {
        this.initSocketIO();
        this.setupEventListeners();
        this.checkExistingBooking();
    }

    /**
     * Initialize Socket.IO connection
     */
    initSocketIO() {
        this.socket = io();

        // Get user ID from session/localStorage
        const userId = this.getUserId();
        if (userId) {
            this.socket.emit('join', { userId, role: 'user' });
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

        this.socket.on('helper_assigned', (data) => {
            console.log('Helper assigned:', data);
            this.handleHelperAssigned(data);
        });

        this.socket.on('helper_reassigned', (data) => {
            console.log('Helper reassigned:', data);
            this.handleHelperReassigned(data);
        });

        this.socket.on('booking:status', (data) => {
            console.log('Booking status update:', data);
            this.handleStatusUpdate(data);
        });

        this.socket.on('booking_accepted', (data) => {
            console.log('Booking accepted:', data);
            this.handleBookingAccepted(data);
        });

        this.socket.on('booking_failed', (data) => {
            console.log('Booking failed:', data);
            this.handleBookingFailed(data);
        });

        this.socket.on('helper:location-update', (data) => {
            console.log('Helper location update:', data);
            this.updateHelperLocation(data);
        });
    }

    /**
     * Setup event listeners for UI elements
     */
    setupEventListeners() {
        // Get current location button
        const locationBtn = document.getElementById('getCurrentLocation');
        if (locationBtn) {
            locationBtn.addEventListener('click', () => this.getCurrentLocation());
        }

        // Booking form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
        }

        // Cancel booking button
        const cancelBtn = document.getElementById('cancelBooking');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelBooking());
        }
    }

    /**
     * Get user's current location using Geolocation API
     */
    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation is not supported by your browser', 'error');
            return;
        }

        this.showNotification('Getting your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Update form fields
                const latInput = document.getElementById('latitude');
                const lngInput = document.getElementById('longitude');

                if (latInput) latInput.value = latitude.toFixed(6);
                if (lngInput) lngInput.value = longitude.toFixed(6);

                // Initialize or update map
                this.initMap(latitude, longitude);

                this.showNotification('Location obtained successfully', 'success');
            },
            (error) => {
                let message = 'Unable to get location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                }
                this.showNotification(message, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    /**
     * Initialize Leaflet map
     */
    initMap(lat, lng) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        // Initialize map if not already done
        if (!this.map) {
            this.map = L.map('map').setView([lat, lng], 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);
        } else {
            this.map.setView([lat, lng], 15);
        }

        // Add or update user marker
        if (this.userMarker) {
            this.userMarker.setLatLng([lat, lng]);
        } else {
            this.userMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '<div style="background: #4f46e5; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                    iconSize: [30, 30]
                })
            }).addTo(this.map);
            this.userMarker.bindPopup('Your Location').openPopup();
        }
    }

    /**
     * Handle booking form submission
     */
    async handleBookingSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating booking...';

        try {
            const formData = this.getFormData(form);

            // Validate form data
            if (!this.validateBookingData(formData)) {
                throw new Error('Please fill in all required fields');
            }

            const response = await fetch('/api/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this.getAuthToken()
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.currentBooking = data.booking;
                this.showNotification('Booking created successfully!', 'success');

                // Redirect to booking status page
                window.location.href = `/user/booking-status?id=${data.booking._id}`;
            } else {
                throw new Error(data.message || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showNotification(error.message, 'error');

            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Confirm Booking';
        }
    }

    /**
     * Get form data
     */
    getFormData(form) {
        const serviceId = form.querySelector('#serviceId')?.value;
        const date = form.querySelector('#bookingDate')?.value;
        const time = form.querySelector('#bookingTime')?.value;
        const street = form.querySelector('#street')?.value;
        const city = form.querySelector('#city')?.value;
        const longitude = parseFloat(form.querySelector('#longitude')?.value);
        const latitude = parseFloat(form.querySelector('#latitude')?.value);
        const notes = form.querySelector('#notes')?.value;

        const scheduledTime = new Date(`${date}T${time}`);

        return {
            serviceId,
            scheduledTime: scheduledTime.toISOString(),
            location: {
                type: 'Point',
                coordinates: [longitude, latitude],
                address: { street, city }
            },
            notes
        };
    }

    /**
     * Validate booking data
     */
    validateBookingData(data) {
        if (!data.serviceId) return false;
        if (!data.scheduledTime) return false;
        if (!data.location.coordinates[0] || !data.location.coordinates[1]) return false;
        if (!data.location.address.street || !data.location.address.city) return false;
        return true;
    }

    /**
     * Handle helper assigned event
     */
    handleHelperAssigned(data) {
        this.showNotification(`Helper ${data.helper.name} has been assigned!`, 'success');
        this.displayHelperInfo(data.helper);
        this.startCountdownTimer();

        // Add helper marker to map
        if (this.map && data.helper.location) {
            const coords = data.helper.location.coordinates;
            this.addHelperMarker(coords[1], coords[0], data.helper.name);
        }
    }

    /**
     * Handle helper reassigned event
     */
    handleHelperReassigned(data) {
        this.showNotification(`New helper ${data.helper.name} assigned`, 'info');
        this.displayHelperInfo(data.helper);

        // Update helper marker
        if (this.map && data.helper.location) {
            const coords = data.helper.location.coordinates;
            this.updateHelperMarker(coords[1], coords[0], data.helper.name);
        }
    }

    /**
     * Handle booking accepted event
     */
    handleBookingAccepted(data) {
        this.showNotification('Helper accepted your booking!', 'success');
        this.stopCountdownTimer();

        const statusElement = document.getElementById('bookingStatus');
        if (statusElement) {
            statusElement.innerHTML = '<span class="badge bg-success">Accepted</span>';
        }

        const approachingAlert = document.getElementById('helperApproaching');
        if (approachingAlert) {
            approachingAlert.style.display = 'block';
        }
    }

    /**
     * Handle status update event
     */
    handleStatusUpdate(data) {
        const statusElement = document.getElementById('bookingStatus');
        if (statusElement) {
            const statusBadge = this.getStatusBadge(data.status);
            statusElement.innerHTML = statusBadge;
        }

        this.showNotification(`Booking status: ${data.status}`, 'info');
    }

    /**
     * Handle booking failed event
     */
    handleBookingFailed(data) {
        this.showNotification('No helper available. Please try again later.', 'error');

        const noHelperDiv = document.getElementById('noHelper');
        if (noHelperDiv) {
            noHelperDiv.style.display = 'block';
        }

        const searchingDiv = document.getElementById('searchingAnimation');
        if (searchingDiv) {
            searchingDiv.style.display = 'none';
        }
    }

    /**
     * Display helper information
     */
    displayHelperInfo(helper) {
        const elements = {
            name: document.getElementById('helperName'),
            rating: document.getElementById('helperRating'),
            phone: document.getElementById('helperPhone'),
            skills: document.getElementById('helperSkills'),
            distance: document.getElementById('helperDistance')
        };

        if (elements.name) elements.name.textContent = helper.name;
        if (elements.rating) elements.rating.textContent = helper.rating.toFixed(1);
        if (elements.phone) elements.phone.textContent = helper.phone;
        if (elements.skills) elements.skills.textContent = helper.skills.join(', ');
        if (elements.distance) elements.distance.textContent = `${helper.distance.toFixed(1)} km`;

        // Show helper assigned section
        const helperSection = document.getElementById('helperAssigned');
        if (helperSection) {
            helperSection.style.display = 'block';
        }

        // Hide searching animation
        const searchingDiv = document.getElementById('searchingAnimation');
        if (searchingDiv) {
            searchingDiv.style.display = 'none';
        }
    }

    /**
     * Add helper marker to map
     */
    addHelperMarker(lat, lng, name) {
        if (!this.map) return;

        if (this.helperMarker) {
            this.map.removeLayer(this.helperMarker);
        }

        this.helperMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'helper-marker',
                html: '<div style="background: #10b981; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [30, 30]
            })
        }).addTo(this.map);
        this.helperMarker.bindPopup(`Helper: ${name}`);

        // Fit bounds to show both markers
        if (this.userMarker) {
            const group = L.featureGroup([this.userMarker, this.helperMarker]);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    /**
     * Update helper marker position
     */
    updateHelperMarker(lat, lng, name) {
        if (this.helperMarker) {
            this.helperMarker.setLatLng([lat, lng]);
        } else {
            this.addHelperMarker(lat, lng, name);
        }
    }

    /**
     * Update helper location (real-time tracking)
     */
    updateHelperLocation(data) {
        if (data.coordinates && data.coordinates.length === 2) {
            const [lng, lat] = data.coordinates;
            this.updateHelperMarker(lat, lng, 'Helper');
        }
    }

    /**
     * Start countdown timer (15 minutes)
     */
    startCountdownTimer() {
        const timerElement = document.getElementById('countdownTimer');
        if (!timerElement) return;

        let timeLeft = 15 * 60; // 15 minutes in seconds

        this.countdownTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;

            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

            timeLeft--;

            if (timeLeft < 0) {
                this.stopCountdownTimer();
                timerElement.textContent = 'Time expired';
            }
        }, 1000);
    }

    /**
     * Stop countdown timer
     */
    stopCountdownTimer() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    /**
     * Cancel booking
     */
    async cancelBooking() {
        if (!this.currentBooking && !this.getBookingIdFromUrl()) {
            this.showNotification('No active booking to cancel', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to cancel this booking?')) {
            return;
        }

        try {
            const bookingId = this.currentBooking?._id || this.getBookingIdFromUrl();

            const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + this.getAuthToken()
                }
            });

            if (response.ok) {
                this.showNotification('Booking cancelled successfully', 'success');
                this.stopCountdownTimer();

                setTimeout(() => {
                    window.location.href = '/user/dashboard';
                }, 2000);
            } else {
                const data = await response.json();
                throw new Error(data.message || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('Cancel error:', error);
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Check for existing booking
     */
    async checkExistingBooking() {
        const bookingId = this.getBookingIdFromUrl();
        if (!bookingId) return;

        try {
            const response = await fetch(`/api/bookings/${bookingId}`, {
                headers: {
                    'Authorization': 'Bearer ' + this.getAuthToken()
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.currentBooking = data.booking;
            }
        } catch (error) {
            console.error('Error checking booking:', error);
        }
    }

    /**
     * Get status badge HTML
     */
    getStatusBadge(status) {
        const badges = {
            'pending': '<span class="badge bg-warning">Pending</span>',
            'assigned': '<span class="badge bg-info">Assigned</span>',
            'accepted': '<span class="badge bg-primary">Accepted</span>',
            'in-progress': '<span class="badge bg-primary">In Progress</span>',
            'completed': '<span class="badge bg-success">Completed</span>',
            'cancelled': '<span class="badge bg-danger">Cancelled</span>',
            'no_helper_available': '<span class="badge bg-secondary">No Helper</span>'
        };
        return badges[status] || `<span class="badge bg-secondary">${status}</span>`;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    /**
     * Get user ID from session/localStorage
     */
    getUserId() {
        // Try to get from meta tag or data attribute
        const userMeta = document.querySelector('meta[name="user-id"]');
        return userMeta?.content || null;
    }

    /**
     * Get auth token from localStorage
     */
    getAuthToken() {
        return localStorage.getItem('token') || '';
    }

    /**
     * Get booking ID from URL
     */
    getBookingIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        // Guard: treat missing or literal "null" string as no ID
        return (id && id !== 'null') ? id : null;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.bookingManager = new UserBookingManager();
});
