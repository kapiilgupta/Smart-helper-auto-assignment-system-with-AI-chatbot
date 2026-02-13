/**
 * Sample Test Data for API Testing
 */

// Sample Users
const sampleUsers = [
    {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        phone: '+919876543210',
        role: 'user',
        location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139], // Delhi
            address: {
                street: '123 Main St',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110001'
            }
        }
    },
    {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        password: 'password123',
        phone: '+919876543211',
        role: 'user',
        location: {
            type: 'Point',
            coordinates: [77.2100, 28.6150],
            address: {
                street: '456 Park Ave',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110002'
            }
        }
    }
];

// Sample Helpers
const sampleHelpers = [
    {
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@example.com',
        password: 'helper123',
        phone: '+919876543220',
        role: 'helper',
        skills: ['plumbing', 'electrical'],
        rating: 4.5,
        availability: true,
        location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139], // Very close to user
            address: {
                street: '789 Helper St',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110001'
            }
        }
    },
    {
        name: 'Amit Sharma',
        email: 'amit.sharma@example.com',
        password: 'helper123',
        phone: '+919876543221',
        role: 'helper',
        skills: ['cleaning', 'cooking'],
        rating: 4.8,
        availability: true,
        location: {
            type: 'Point',
            coordinates: [77.2100, 28.6150], // Nearby
            address: {
                street: '321 Service Rd',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110002'
            }
        }
    },
    {
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        password: 'helper123',
        phone: '+919876543222',
        role: 'helper',
        skills: ['plumbing'],
        rating: 4.2,
        availability: true,
        location: {
            type: 'Point',
            coordinates: [77.2200, 28.6200], // Further away
            address: {
                street: '555 Far St',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110003'
            }
        }
    },
    {
        name: 'Offline Helper',
        email: 'offline@example.com',
        password: 'helper123',
        phone: '+919876543223',
        role: 'helper',
        skills: ['plumbing'],
        rating: 4.9,
        availability: false, // Offline
        location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139],
            address: {
                street: '999 Offline St',
                city: 'New Delhi',
                state: 'Delhi',
                zipCode: '110001'
            }
        }
    }
];

// Sample Services
const sampleServices = [
    {
        name: 'Plumbing Repair',
        category: 'plumbing',
        description: 'Fix leaks, install fixtures, repair pipes',
        basePrice: 500,
        estimatedDuration: 60,
        icon: 'bi-wrench'
    },
    {
        name: 'Electrical Work',
        category: 'electrical',
        description: 'Wiring, switch installation, appliance repair',
        basePrice: 600,
        estimatedDuration: 90,
        icon: 'bi-lightning'
    },
    {
        name: 'House Cleaning',
        category: 'cleaning',
        description: 'Deep cleaning, regular maintenance',
        basePrice: 400,
        estimatedDuration: 120,
        icon: 'bi-house'
    },
    {
        name: 'Cooking Service',
        category: 'cooking',
        description: 'Meal preparation, catering',
        basePrice: 300,
        estimatedDuration: 60,
        icon: 'bi-egg-fried'
    }
];

// Sample Bookings
const sampleBookings = [
    {
        status: 'pending',
        scheduledTime: new Date(Date.now() + 3600000), // 1 hour from now
        notes: 'Please bring necessary tools'
    },
    {
        status: 'assigned',
        scheduledTime: new Date(Date.now() + 7200000), // 2 hours from now
        notes: 'Urgent repair needed'
    },
    {
        status: 'completed',
        scheduledTime: new Date(Date.now() - 3600000), // 1 hour ago
        notes: 'Regular maintenance'
    }
];

// Mock Socket.IO Events
const mockSocketEvents = {
    bookingCreated: {
        event: 'booking:created',
        data: {
            bookingId: '507f1f77bcf86cd799439011',
            userId: '507f1f77bcf86cd799439012',
            serviceId: '507f1f77bcf86cd799439013'
        }
    },
    helperAssigned: {
        event: 'booking:helper-assigned',
        data: {
            bookingId: '507f1f77bcf86cd799439011',
            helperId: '507f1f77bcf86cd799439014'
        }
    },
    locationUpdate: {
        event: 'helper:location-update',
        data: {
            helperId: '507f1f77bcf86cd799439014',
            location: {
                type: 'Point',
                coordinates: [77.2095, 28.6145]
            }
        }
    }
};

// Test Locations
const testLocations = {
    delhi: { latitude: 28.6139, longitude: 77.2090 },
    mumbai: { latitude: 19.0760, longitude: 72.8777 },
    bangalore: { latitude: 12.9716, longitude: 77.5946 },
    nearbyDelhi: { latitude: 28.6150, longitude: 77.2100 },
    farDelhi: { latitude: 28.7041, longitude: 77.1025 }
};

module.exports = {
    sampleUsers,
    sampleHelpers,
    sampleServices,
    sampleBookings,
    mockSocketEvents,
    testLocations
};
