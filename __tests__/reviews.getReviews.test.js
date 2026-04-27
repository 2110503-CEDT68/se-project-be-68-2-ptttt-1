/**
 * Test Suite: View Reviews (US2-3 / US2-5)
 *
 * GET /api/v1/campgrounds/:campgroundId/reviews
 * Access: Public (can also be accessed by Admin and Non-admin)
 *
 * Focus: Viewing campground reviews
 *
 * TC grouping:
 *   [Valid]   TC-1 Campground ID is string
 *   [Invalid] TC-2 Campground ID is empty or null
 *   [Valid]   TC-3 Admin view all reviews
 *   [Valid]   TC-4 Non-admin view all reviews
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
const { createCampgroundAndBooking, buildReviewPayload } = require('./helpers/reviewHelper');

// Mount reviews route specifically for this test suite since it's not in app.js
app.use('/api/v1/reviews', require('../routes/reviews'));

describe('US2-3 View Reviews', () => {
  let campground;
  let user;
  let admin;
  let userToken;
  let adminToken;
  let review;
  let booking;

  beforeEach(async () => {
    // Setup users
    const userData = await createUserAndToken('user');
    user = userData.user;
    userToken = userData.token;

    // Manually create admin to avoid duplicate tel/email from authHelper
    admin = await User.create({
      name: 'Test admin',
      email: 'admin_unique@test.com',
      password: 'password123',
      tel: '0812345679', // different from authHelper's 0812345678
      role: 'admin'
    });
    adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

    // Setup campground and review
    const cbData = await createCampgroundAndBooking(user._id);
    campground = cbData.campground;
    booking = cbData.booking;

    // Create a review directly to be viewed
    review = await Review.create({
      rating: 5,
      comment: 'Excellent campground, highly recommended.',
      campground: campground._id,
      user: user._id,
      booking: booking._id,
    });
  });

  afterEach(async () => {
    // Clear specifically created data back to the state before the test
    if (review) await Review.findByIdAndDelete(review._id);
    if (booking) await Booking.findByIdAndDelete(booking._id);
    if (campground) await Campground.findByIdAndDelete(campground._id);
    if (user) await User.findByIdAndDelete(user._id);
    if (admin) await User.findByIdAndDelete(admin._id);
  });

  // ─── TC-1: Campground ID is string (Valid) ──────────────────────────────────
  describe('TC-1: Campground ID is string', () => {
    it('should return 200 and list the reviews for the given campground string ID', async () => {
      const res = await request(app).get(`/api/v1/campgrounds/${campground._id.toString()}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].comment).toBe('Excellent campground, highly recommended.');
    });
  });

  // ─── TC-2: Campground ID is empty or null (Invalid) ─────────────────────────
  describe('TC-2: Campground ID is empty or null', () => {
    it('should return 400 when accessing the reviews base route directly without a campground ID', async () => {
      // Accessing /api/v1/reviews directly means req.params.campgroundId is undefined/empty
      const res = await request(app).get('/api/v1/reviews');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.msg).toBe('Please provide a campground ID');
    });
  });

  // ─── TC-3: Admin view all reviews (Valid) ───────────────────────────────────
  describe('TC-3: Admin view all reviews', () => {
    it('should return 200 and allow an admin to view the reviews', async () => {
      const res = await request(app)
        .get(`/api/v1/campgrounds/${campground._id}/reviews`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  // ─── TC-4: Non-admin view all reviews (Valid) ───────────────────────────────
  describe('TC-4: Non-admin view all reviews', () => {
    it('should return 200 and allow a non-admin (user) to view the reviews', async () => {
      const res = await request(app)
        .get(`/api/v1/campgrounds/${campground._id}/reviews`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });
});
