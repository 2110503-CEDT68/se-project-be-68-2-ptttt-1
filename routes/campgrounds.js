const express = require('express');
const { getCampgrounds, getCampground, createCampground, updateCampground, deleteCampground } = require('../controllers/campgrounds');

// Include other resource routers
const bookingRouter = require('./bookings');
const reviewRouter = require('./reviews');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Re-route into other resource routers
router.use('/:campgroundId/bookings', bookingRouter);
router.use('/:campgroundId/reviews', reviewRouter);

router.route('/').get(getCampgrounds).post(protect, authorize('admin'), createCampground);
router.route('/:id').get(getCampground).put(protect, authorize('admin'), updateCampground).delete(protect, authorize('admin'), deleteCampground);

module.exports = router;