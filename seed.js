const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Helper = require('./models/Helper');
const Service = require('./models/Service');
const Booking = require('./models/Booking');

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected for seeding'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Sample Services
const services = [
    {
        name: 'House Cleaning',
        description: 'Professional house cleaning service including dusting, mopping, and sanitization',
        basePrice: 500,
        estimatedDuration: 120,
        category: 'Cleaning'
    },
    {
        name: 'Plumbing Repair',
        description: 'Fix leaks, unclog drains, and repair pipes',
        basePrice: 800,
        estimatedDuration: 90,
        category: 'Plumbing'
    },
    {
        name: 'Electrical Work',
        description: 'Electrical repairs, wiring, and fixture installation',
        basePrice: 1000,
        estimatedDuration: 120,
        category: 'Electrical'
    },
    {
        name: 'Garden Maintenance',
        description: 'Lawn mowing, trimming, and garden care',
        basePrice: 600,
        estimatedDuration: 150,
        category: 'Gardening'
    },
    {
        name: 'Home Cooking',
        description: 'Professional cooking service for meals and events',
        basePrice: 700,
        estimatedDuration: 180,
        category: 'Other'
    }
];

// Sample Users
const users = [
    {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@example.com',
        password: 'password123',
        phone: '+91-9876543210',
        address: {
            street: '123 MG Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400001',
            coordinates: [72.8777, 19.0760] // [longitude, latitude] - Mumbai
        }
    },
    {
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        password: 'password123',
        phone: '+91-9876543211',
        address: {
            street: '456 Brigade Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400002',
            coordinates: [72.8347, 19.0144]
        }
    },
    {
        name: 'Amit Kumar',
        email: 'amit.kumar@example.com',
        password: 'password123',
        phone: '+91-9876543212',
        address: {
            street: '789 Park Street',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400003',
            coordinates: [72.8261, 18.9750]
        }
    }
];

// Sample Helpers with realistic Mumbai coordinates
const helpers = [
    {
        name: 'Suresh Yadav',
        email: 'suresh.yadav@helper.com',
        password: 'helper123',
        phone: '+91-9123456780',
        skills: ['Cleaning', 'Gardening'],
        location: { type: 'Point', coordinates: [72.8777, 19.0760] }, // Colaba
        rating: 4.5,
        totalRatings: 120,
        availability: true,
        completedBookings: 95
    },
    {
        name: 'Ramesh Singh',
        email: 'ramesh.singh@helper.com',
        password: 'helper123',
        phone: '+91-9123456781',
        skills: ['Plumbing', 'Electrical'],
        location: { type: 'Point', coordinates: [72.8347, 19.0144] }, // Bandra
        rating: 4.8,
        totalRatings: 200,
        availability: true,
        completedBookings: 180
    },
    {
        name: 'Lakshmi Devi',
        email: 'lakshmi.devi@helper.com',
        password: 'helper123',
        phone: '+91-9123456782',
        skills: ['Cleaning', 'Cooking'],
        location: { type: 'Point', coordinates: [72.8261, 18.9750] }, // Andheri
        rating: 4.7,
        totalRatings: 150,
        availability: true,
        completedBookings: 130
    },
    {
        name: 'Vijay Patil',
        email: 'vijay.patil@helper.com',
        password: 'helper123',
        phone: '+91-9123456783',
        skills: ['Electrical', 'Plumbing'],
        location: { type: 'Point', coordinates: [72.8479, 19.0330] }, // Dadar
        rating: 4.6,
        totalRatings: 110,
        availability: true,
        completedBookings: 88
    },
    {
        name: 'Meena Kumari',
        email: 'meena.kumari@helper.com',
        password: 'helper123',
        phone: '+91-9123456784',
        skills: ['Cooking', 'Cleaning'],
        location: { type: 'Point', coordinates: [72.8560, 19.1076] }, // Borivali
        rating: 4.9,
        totalRatings: 250,
        availability: true,
        completedBookings: 230
    },
    {
        name: 'Rajesh Verma',
        email: 'rajesh.verma@helper.com',
        password: 'helper123',
        phone: '+91-9123456785',
        skills: ['Gardening', 'Cleaning'],
        location: { type: 'Point', coordinates: [72.8882, 19.0896] }, // Powai
        rating: 4.3,
        totalRatings: 85,
        availability: true,
        completedBookings: 70
    },
    {
        name: 'Sunita Sharma',
        email: 'sunita.sharma@helper.com',
        password: 'helper123',
        phone: '+91-9123456786',
        skills: ['Cleaning', 'Cooking'],
        location: { type: 'Point', coordinates: [72.8258, 19.0825] }, // Goregaon
        rating: 4.4,
        totalRatings: 95,
        availability: true,
        completedBookings: 78
    },
    {
        name: 'Mohan Das',
        email: 'mohan.das@helper.com',
        password: 'helper123',
        phone: '+91-9123456787',
        skills: ['Plumbing', 'Gardening'],
        location: { type: 'Point', coordinates: [72.8310, 18.9388] }, // Chembur
        rating: 4.2,
        totalRatings: 75,
        availability: true,
        completedBookings: 60
    },
    {
        name: 'Kavita Nair',
        email: 'kavita.nair@helper.com',
        password: 'helper123',
        phone: '+91-9123456788',
        skills: ['Cooking', 'Cleaning'],
        location: { type: 'Point', coordinates: [72.8081, 18.9894] }, // Santacruz
        rating: 4.7,
        totalRatings: 140,
        availability: true,
        completedBookings: 125
    },
    {
        name: 'Anil Gupta',
        email: 'anil.gupta@helper.com',
        password: 'helper123',
        phone: '+91-9123456789',
        skills: ['Electrical', 'Plumbing'],
        location: { type: 'Point', coordinates: [72.8656, 19.0176] }, // Kurla
        rating: 4.5,
        totalRatings: 105,
        availability: true,
        completedBookings: 90
    },
    {
        name: 'Deepa Iyer',
        email: 'deepa.iyer@helper.com',
        password: 'helper123',
        phone: '+91-9123456790',
        skills: ['Cleaning', 'Gardening'],
        location: { type: 'Point', coordinates: [72.8526, 19.1136] }, // Kandivali
        rating: 4.6,
        totalRatings: 115,
        availability: true,
        completedBookings: 98
    },
    {
        name: 'Prakash Joshi',
        email: 'prakash.joshi@helper.com',
        password: 'helper123',
        phone: '+91-9123456791',
        skills: ['Plumbing', 'Electrical'],
        location: { type: 'Point', coordinates: [72.8397, 18.9220] }, // Ghatkopar
        rating: 4.8,
        totalRatings: 180,
        availability: true,
        completedBookings: 165
    },
    {
        name: 'Anita Desai',
        email: 'anita.desai@helper.com',
        password: 'helper123',
        phone: '+91-9123456792',
        skills: ['Cooking', 'Cleaning'],
        location: { type: 'Point', coordinates: [72.8333, 19.0728] }, // Malad
        rating: 4.4,
        totalRatings: 90,
        availability: true,
        completedBookings: 75
    },
    {
        name: 'Sanjay Reddy',
        email: 'sanjay.reddy@helper.com',
        password: 'helper123',
        phone: '+91-9123456793',
        skills: ['Gardening', 'Plumbing'],
        location: { type: 'Point', coordinates: [72.8489, 19.0596] }, // Matunga
        rating: 3.9,
        totalRatings: 65,
        availability: true,
        completedBookings: 50
    },
    {
        name: 'Geeta Menon',
        email: 'geeta.menon@helper.com',
        password: 'helper123',
        phone: '+91-9123456794',
        skills: ['Cleaning', 'Cooking'],
        location: { type: 'Point', coordinates: [72.8148, 19.0412] }, // Juhu
        rating: 5.0,
        totalRatings: 300,
        availability: true,
        completedBookings: 285
    }
];

// Seed function
const seedDatabase = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await Helper.deleteMany({});
        await Service.deleteMany({});
        await Booking.deleteMany({});
        console.log('Cleared existing data');

        // Insert services
        const createdServices = await Service.insertMany(services);
        console.log(`✓ Created ${createdServices.length} services`);

        // Insert users
        const createdUsers = await User.insertMany(users);
        console.log(`✓ Created ${createdUsers.length} users`);

        // Insert helpers
        const createdHelpers = await Helper.insertMany(helpers);
        console.log(`✓ Created ${createdHelpers.length} helpers`);

        console.log('\n✅ Database seeded successfully!');
        console.log('\nSample credentials:');
        console.log('User: rahul.sharma@example.com / password123');
        console.log('Helper: suresh.yadav@helper.com / helper123');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run seed
seedDatabase();
