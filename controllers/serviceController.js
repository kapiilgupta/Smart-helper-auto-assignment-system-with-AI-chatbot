const Service = require('../models/Service');

/**
 * Get all services
 * @route GET /api/services
 * @access Public
 */
const getAllServices = async (req, res) => {
    try {
        const { category } = req.query;

        const filter = category ? { category } : {};

        const services = await Service.find(filter).sort({ name: 1 });

        res.json({ services, count: services.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Get service details by ID
 * @route GET /api/services/:id
 * @access Public
 */
const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ service });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllServices,
    getServiceById
};
