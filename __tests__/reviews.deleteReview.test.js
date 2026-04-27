/**
 * Test Suite: Delete Review (US2-4)
 *
 * DELETE /api/v1/reviews/:id
 * Access: Private (requires JWT)
 *
 * Focus:
 *   - Review ID is a valid string (Valid)
 *   - Review ID is empty or null (Invalid)
 *   - User is the review's owner (Valid)
 *   - User is not the review's owner (Invalid)
 *   - Review ID does not exist (Invalid)
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Campground = require('../models/Campground');
const Review = require('../models/Review');
const User = require('../models/User');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');
const { createUserAndToken } = require('./helpers/authHelper');
const { createCampgroundAndBooking } = require('./helpers/reviewHelper');

// Mount reviews route specifically for this test suite
app.use('/api/v1/reviews', require('../routes/reviews'));

describe('US2-4 Delete Review Tests', () => {
  let campground;
  let user1, user1Token;
  let user2, user2Token;
  let review1, review2;
  let booking1, booking2, booking3;

  beforeEach(async () => {
    // Setup users
    const userData1 = await createUserAndToken('user');
    user1 = userData1.user;
    user1Token = userData1.token;

    // Manually create user2 to avoid duplicate tel/email
    user2 = await User.create({
      name: 'Test user2',
      email: 'user2_unique@test.com',
      password: 'password123',
      tel: '0812345679',
      role: 'user'
    });
    user2Token = jwt.sign({ id: user2._id }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

    // Setup campground and bookings
    const cbData = await createCampgroundAndBooking(user1._id);
    campground = cbData.campground;
    booking1 = cbData.booking;

    booking2 = await Booking.create({
      bookingDate: new Date(),
      nights: 1,
      user: user2._id,
      campground: campground._id,
    });

    booking3 = await Booking.create({
      bookingDate: new Date(),
      nights: 2,
      user: user1._id,
      campground: campground._id,
    });

    // Create a review by user1 (for TC-1 & TC-3)
    review1 = await Review.create({
      rating: 5,
      comment: 'Review for valid string test',
      campground: campground._id,
      user: user1._id,
      booking: booking1._id,
    });

    // Create another review by user1 (for owner/non-owner tests)
    review2 = await Review.create({
      rating: 4,
      comment: 'Review for ownership test',
      campground: campground._id,
      user: user1._id,
      booking: booking3._id,
    });
  });

  afterEach(async () => {
    // Clear specifically created data back to the state before the test
    if (review1) await Review.findByIdAndDelete(review1._id);
    if (review2) await Review.findByIdAndDelete(review2._id);
    if (booking1) await Booking.findByIdAndDelete(booking1._id);
    if (booking2) await Booking.findByIdAndDelete(booking2._id);
    if (booking3) await Booking.findByIdAndDelete(booking3._id);
    if (campground) await Campground.findByIdAndDelete(campground._id);
    if (user1) await User.findByIdAndDelete(user1._id);
    if (user2) await User.findByIdAndDelete(user2._id);
  });

  // ─── TC-1: Review ID is a valid string ─────────────────────────────────────
  describe('Review ID is a valid string', () => {
    it('should return 200 (Valid) and delete the review', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review1._id.toString()}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const checkReview = await Review.findById(review1._id);
      expect(checkReview).toBeNull();
    });
  });

  // ─── TC-2: Review ID is empty or null ──────────────────────────────────────
  describe('Review ID is empty or null', () => {
    it('should return error (Invalid) when passing "null" as ID', async () => {
      // Passing 'null' string will fail MongoDB cast and return 500 in this controller
      const res = await request(app)
        .delete('/api/v1/reviews/null')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 (Invalid) when ID is completely empty', async () => {
      // DELETE /api/v1/reviews/ doesn't exist
      const res = await request(app)
        .delete('/api/v1/reviews/')
        .set('Authorization', `Bearer ${user1Token}`);

      // The Express router doesn't match a DELETE route on /api/v1/reviews
      expect(res.status).toBe(404);
    });
  });

  // ─── TC-3: User is the review's owner ──────────────────────────────────────
  describe('User is the review\'s owner', () => {
    it('should return 200 (Valid) when the owner deletes their review', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review2._id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── TC-4: User is not the review's owner ──────────────────────────────────
  describe('User is not the review\'s owner', () => {
    it('should return 403 (Invalid) when a different user tries to delete the review', async () => {
      const res = await request(app)
        .delete(`/api/v1/reviews/${review2._id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.msg).toBe('Not authorized to delete this review');
    });
  });

  // ─── TC-5: Review ID does not exist ────────────────────────────────────────
  describe('Review ID does not exist', () => {
    it('should return 404 (Invalid) when passing a non-existent valid ObjectId', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/v1/reviews/${nonExistentId}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.msg).toBe(`No review with the id of ${nonExistentId}`);
    });
  });

});
