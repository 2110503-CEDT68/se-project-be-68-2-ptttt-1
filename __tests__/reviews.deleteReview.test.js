/**
 * Test Suite: Delete Review (US2-4)
 *
 * DELETE /api/v1/reviews/:id
 * Access: Private (requires JWT)
 *
 * TC grouping:
 *   [Valid]   TC-1 Review ID is a valid string
 *   [Invalid] TC-2 Review ID is empty or null
 *   [Valid]   TC-3 User is the review's owner
 *   [Invalid] TC-4 User is not the review's owner
 *   [Invalid] TC-5 Review ID does not exist
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

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Delete Review Validations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: Review ID is a valid string ─────────────────────────────────────

describe('TC-1: Review ID is a valid string', () => {
  it('should return 200 (Valid) and delete the review', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const review = await Review.create({
      rating: 5,
      comment: 'Review for valid string test',
      campground: campground._id,
      user: user._id,
      booking: booking._id,
    });

    const res = await request(app)
      .delete(`/api/v1/reviews/${review._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    
    const checkReview = await Review.findById(review._id);
    expect(checkReview).toBeNull();
  });
});

// ─── TC-2: Review ID is empty or null ──────────────────────────────────────

describe('TC-2: Review ID is empty or null', () => {
  it('should return error (Invalid) when passing "null" as ID', async () => {
    const { token } = await createUserAndToken('user');

    // Passing 'null' string will fail MongoDB cast and return 500 in this controller
    const res = await request(app)
      .delete('/api/v1/reviews/null')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 (Invalid) when ID is completely empty', async () => {
    const { token } = await createUserAndToken('user');

    // DELETE /api/v1/reviews/ doesn't exist
    const res = await request(app)
      .delete('/api/v1/reviews/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── TC-3: User is the review's owner ──────────────────────────────────────

describe('TC-3: User is the review\'s owner', () => {
  it('should return 200 (Valid) when the owner deletes their review', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const review = await Review.create({
      rating: 4,
      comment: 'Review for ownership test',
      campground: campground._id,
      user: user._id,
      booking: booking._id,
    });

    const res = await request(app)
      .delete(`/api/v1/reviews/${review._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── TC-4: User is not the review's owner ──────────────────────────────────

describe('TC-4: User is not the review\'s owner', () => {
  it('should return 403 (Invalid) when a different user tries to delete the review', async () => {
    const { user: owner } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(owner._id);

    const review = await Review.create({
      rating: 4,
      comment: 'Review for ownership test',
      campground: campground._id,
      user: owner._id,
      booking: booking._id,
    });

    const user2 = await User.create({
      name: 'Test user2',
      email: 'user2_unique@test.com',
      password: 'password123',
      tel: '0812345679',
      role: 'user'
    });
    const user2Token = jwt.sign({ id: user2._id }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });

    const res = await request(app)
      .delete(`/api/v1/reviews/${review._id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toBe('Not authorized to delete this review');
  });
});

// ─── TC-5: Review ID does not exist ────────────────────────────────────────

describe('TC-5: Review ID does not exist', () => {
  it('should return 404 (Invalid) when passing a non-existent valid ObjectId', async () => {
    const { token } = await createUserAndToken('user');
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const res = await request(app)
      .delete(`/api/v1/reviews/${nonExistentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toBe(`No review with the id of ${nonExistentId}`);
  });
});
