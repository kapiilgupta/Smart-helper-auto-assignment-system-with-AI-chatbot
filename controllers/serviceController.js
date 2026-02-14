const Service = require('../models/Service');

/**
 * Get all services
 * @route GET /api/services
 * @access Public
 */
const getAllServices = async (req, res, next) => {
    try {
        const { category } = req.query;

        const filter = category ? { category } : {};

        const services = await Service.find(filter).sort({ name: 1 });

        res.json({ services, count: services.length });
    } catch (error) { next(error);
    }
};

/**
 * Get service details by ID
 * @route GET /api/services/:id
 * @access Public
 */
const getServiceById = async (req, res, next) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ service });
    } catch (error) { next(error);
    }
};

module.exports = {
    getAllServices,
    getServiceById
};
