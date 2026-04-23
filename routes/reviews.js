const express = require("express");

const { createReview, getReviews, deleteReview } = require("../controllers/reviews");

const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/auth");

router.route("/").get(getReviews).post(protect, createReview);
router.route("/:id").delete(protect, deleteReview);

module.exports = router;
