const Review = require("../models/Review");

// @desc    Get reviews
// @route   GET /api/v1/reviews
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
