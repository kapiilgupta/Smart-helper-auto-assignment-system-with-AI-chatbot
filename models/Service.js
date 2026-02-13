const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true,
        unique: true
    },
    description: {
        type: String,
        required: [true, 'Service description is required'],
        trim: true
    },
    basePrice: {
        type: Number,
        required: [true, 'Base price is required'],
        min: 0
    },
    estimatedDuration: {
        type: Number, // in minutes
        required: [true, 'Estimated duration is required'],
        min: 0
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Plumbing', 'Electrical', 'Cleaning', 'Carpentry', 'Painting', 'Gardening', 'Other'],
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Service', serviceSchema);
