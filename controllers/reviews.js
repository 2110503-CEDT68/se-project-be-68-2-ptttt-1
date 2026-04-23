const Review = require("../models/Review");
const Campground = require("../models/Campground");
const Booking = require("../models/Booking");

// @desc    Create new review
// @route   POST /api/v1/campgrounds/:campgroundId/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    // required fields
    // rating, comment, booking

    const campgroundId = req.params.campgroundId || req.params.id;
    req.body.campground = campgroundId;
    req.body.user = req.user.id;

    // check if campground exists
    const campground = await Campground.findById(campgroundId);
    if (!campground) {
      return res
        .status(404)
        .json({ success: false, msg: `Campground not found with id of ${campgroundId}` });
    }

    // check if booking ID is provided
    if (!req.body.booking) {
      return res
        .status(400)
        .json({ success: false, msg: "Please provide a booking ID" });
    }

    // check if booking exists
    const booking = await Booking.findById(req.body.booking);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, msg: `Booking not found with id of ${req.body.booking}` });
    }

    // check if this booking belongs to the current user
    if (booking.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to review this booking",
      });
    }

    // check if this booking is for this campground
    if (booking.campground.toString() !== campgroundId) {
      return res.status(400).json({
        success: false,
        msg: "This booking does not belong to this campground",
      });
    }

    // check if user already reviewed this booking
    const duplicate = await Review.findOne({ booking: req.body.booking, user: req.user.id });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        msg: "You have already reviewed this booking",
      });
    }

    // validate rating value explicitly before saving
    // model-level validation catches this too, but gives a generic "Server error" message
    if (!req.body.rating) {
      return res.status(400).json({ success: false, msg: "Please provide a rating" });
    }

    const ratingValue = Number(req.body.rating);
    if (isNaN(ratingValue) || !Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({
        success: false,
        msg: "Rating must be an integer between 1 and 5",
      });
    }

    const review = await Review.create(req.body);

    // update campground rating stats
    const rating = Number(req.body.rating);
    campground.sumRating += rating;
    campground.countReview += 1;
    campground.ratingCount[rating - 1] += 1;

    // mark ratingCount as modified to save array changes properly
    campground.markModified("ratingCount");
    await campground.save();

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, msg: "Server error" });
  }
};

// @desc    Get reviews
// @route   GET /api/v1/campgrounds/:campgroundId/reviews
// @access  Public
exports.getReviews = async (req, res, next) => {
  try {
    let query;

    if (req.params.campgroundId) {
      query = Review.find({ campground: req.params.campgroundId });
    } else {
      res.status(400).json({
        success: false,
        msg: "Please provide a campground ID",
      });
      return;
    }

    const reviews = await query
      .populate({
        path: "campground",
        select: "name address tel",
      })
      .populate({
        path: "user",
        select: "name email",
      });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id
// @access  Private
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        msg: `No review with the id of ${req.params.id}`,
      });
    }

    // Make sure review belongs to user
    if (review.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        msg: "Not authorized to delete this review",
      });
    }

    // Fetch the campground to update stats
    const campground = await Campground.findById(review.campground);

    if (campground) {
      // Decrease the stats relative to this review
      const rating = Number(review.rating);
      campground.sumRating -= rating;
      campground.countReview -= 1;

      // Ensure it doesn't go below 0
      if (campground.ratingCount[rating - 1] > 0) {
        campground.ratingCount[rating - 1] -= 1;
      }

      campground.markModified("ratingCount");
      await campground.save();
    }

    await review.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      msg: "Server error",
    });
  }
};
