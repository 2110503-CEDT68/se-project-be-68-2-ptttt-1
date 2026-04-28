const express = require("express");

const { createReview, getReviews, deleteReview } = require("../controllers/reviews");

const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/auth");

/**
 * @swagger
 * /api/v1/campgrounds/{campgroundId}/reviews:
 *   get:
 *     summary: Get all reviews for a campground
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: campgroundId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the campground
 *         example: 6634a1b2c3d4e5f6a7b8c9d0
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 3 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Review'
 *       404:
 *         description: Campground not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Create a review for a campground (requires a completed booking)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: campgroundId
 *         required: true
 *         schema:
 *           type: string
 *         example: 6634a1b2c3d4e5f6a7b8c9d0
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewInput'
 *     responses:
 *       201:
 *         description: Review created and campground rating stats updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Review'
 *       400:
 *         description: |
 *           Review creation failed. Possible reasons:
 *           - Missing or empty comment
 *           - Comment exceeds 1000 characters
 *           - Booking ID not provided
 *           - Booking does not belong to this campground
 *           - Rating is not an integer between 1 and 5
 *           - You have already reviewed this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Booking does not belong to the current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Campground or booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/").get(getReviews).post(protect, createReview);

/**
 * @swagger
 * /api/v1/campgrounds/{campgroundId}/reviews/{id}:
 *   delete:
 *     summary: Delete a review by ID (review owner only)
 *     description: |
 *       Only the user who created the review can delete it.
 *       **Admins cannot delete other users' reviews** via this endpoint.
 *       On successful deletion, campground rating stats (sumRating, countReview, ratingCount) are updated automatically.
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: campgroundId
 *         required: true
 *         schema:
 *           type: string
 *         example: 6634a1b2c3d4e5f6a7b8c9d0
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the review
 *         example: 6634d1b2c3d4e5f6a7b8c9d3
 *     responses:
 *       200:
 *         description: Review deleted and campground rating stats recalculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: object, example: {} }
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not authorized — only the review owner can delete their review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/:id").delete(protect, deleteReview);

module.exports = router;

