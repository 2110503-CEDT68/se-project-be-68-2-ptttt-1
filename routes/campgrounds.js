const express = require('express');
const {getCampgrounds, getCampground, createCampground, updateCampground, deleteCampground} = require('../controllers/campgrounds');

// Include other resource routers
const bookingRouter = require('./bookings');

const {protect, authorize} = require('../middleware/auth');

const router = express.Router();

// Re-route into other resource routers
router.use('/:campgroundId/bookings', bookingRouter);

router.route('/').get(getCampgrounds)
router.route('/:id').get(getCampground)

module.exports = router;