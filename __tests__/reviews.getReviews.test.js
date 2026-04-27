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
const { createCampgroundAndBooking } = require('./helpers/reviewHelper');

// Mount reviews route specifically for this test suite since it's not in app.js
app.use('/api/v1/reviews', require('../routes/reviews'));

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — View Reviews
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: Campground ID is string (Valid) ──────────────────────────────────

describe('TC-1: Campground ID is string', () => {
  it('should return 200 and list the reviews for the given campground string ID', async () => {
    const { user } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    await Review.create({
      rating: 5,
      comment: 'Excellent campground, highly recommended.',
      campground: campground._id,
      user: user._id,
      booking: booking._id,
    });

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
    const { user: admin, token: adminToken } = await createUserAndToken('admin');
    const { campground, booking } = await createCampgroundAndBooking(admin._id);

    await Review.create({
      rating: 5,
      comment: 'Excellent campground, highly recommended.',
      campground: campground._id,
      user: admin._id,
      booking: booking._id,
    });

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
    const { user, token: userToken } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    await Review.create({
      rating: 5,
      comment: 'Excellent campground, highly recommended.',
      campground: campground._id,
      user: user._id,
      booking: booking._id,
    });

    const res = await request(app)
      .get(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-5: Server error during getReviews ────────────────────────────────────

describe('TC-5: Server error during getReviews', () => {
  it('should return 500 with "Server error" message when database query fails', async () => {
    const { user } = await createUserAndToken('user');
    const { campground } = await createCampgroundAndBooking(user._id);
    
    const Review = require('../models/Review');
    
    // Mock Review.find to throw an error
    const originalFind = Review.find;
    Review.find = jest.fn().mockImplementationOnce(() => {
      throw new Error('Database query failed');
    });

    const res = await request(app).get(`/api/v1/campgrounds/${campground._id}/reviews`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toBe('Server error');

    // Restore original implementation
    Review.find = originalFind;
  });
});
