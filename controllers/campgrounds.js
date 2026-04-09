const Campground = require('../models/Campground');
const Booking = require('../models/Booking');

// @desc    Get all Campgrounds
// @route   GET /api/v1/campgrounds
// @access  Public
exports.getCampgrounds = async (req, res, next) => {
    try {
        let query;

        // Copy req.query
        const reqQuery = {...req.query};

        // Field to exclude
        const removeFields = ['select','sort','page','limit'];

        // Loop over remove fields and delete them from reqQuery
        removeFields.forEach(param => delete reqQuery[param]);
        console.log(reqQuery);

        let queryStr = JSON.stringify(reqQuery);
        // Create operators ($gt, $gte, etc)
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
        
        // Finding resource
        query = Campground.find(JSON.parse(queryStr)).populate('bookings');

        // Select Fields
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        }
        else {
            query = query.sort('-createdAt');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page-1)*limit;
        const endIndex = page*limit;
        const total = await Campground.countDocuments();

        query = query.skip(startIndex).limit(limit);

        // Executing Query
        const campgrounds = await query;
        // Pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = {
                page: page+1,
                limit
            }
        } 

        if (startIndex > 0) {
            pagination.prev = {
                page: page-1,
                limit
            }
        }
        console.log(req.query);
        res.status(200).json({
            success: true,
            count: campgrounds.length,
            pagination, 
            data: campgrounds
        });
    }
    catch (err) {
        res.status(400).json({success: false});
    }
};

// @desc    Get single campground
// @route   GET /api/v1/campgrounds/:id
// @access  Public
exports.getCampground = async (req, res, next) => {
    try {
        const campground = await Campground.findById(req.params.id);
        if (!campground)
            return res.status(400).json({success: false});
        res.status(200).json({success: true, data: campground});
    } catch (err) {
        res.status(400).json({success: false});
    }
};