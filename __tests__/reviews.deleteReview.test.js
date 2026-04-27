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
const { createCampgroundAndBooking,buildReviewPayload,createBooking  } = require('./helpers/reviewHelper');
async function createReview(campgroundId, token, bookingId, overrides = {}) {
  const res = await request(app)
    .post(`/api/v1/campgrounds/${campgroundId}/reviews`)
    .set('Authorization', `Bearer ${token}`)
    .send(buildReviewPayload(bookingId, overrides));
  return res;
}
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
// ─── TC-6: Delete the only review → stats reset to zero ──────────────────────

describe('TC-4: Delete the only review resets campground rating stats to zero', () => {
  it('should return 200 and campground sumRating/countReview become 0', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const createRes = await createReview(campground._id, token, booking._id, { rating: 4, comment: 'Great!' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    const campgroundRes = await request(app)
      .get(`/api/v1/campgrounds/${campground._id}`);

    expect(campgroundRes.body.data.sumRating).toBe(0);
    expect(campgroundRes.body.data.countReview).toBe(0);
  });
});

// ─── TC-7: Delete one of multiple reviews → stats decrease correctly ──────────
describe('TC-5: Delete one review from multiple reviews decreases stats correctly', () => {
  it('should return 200 and sumRating/countReview decrease by the deleted review rating', async () => {
    const { user: user1, token: token1 } = await createUserAndToken('user');
    const { user: user2, token: token2 } = await createUserAndToken('user');

    // สร้าง campground เดียว แล้วให้ทั้งสอง user จอง campground เดียวกัน
    const { campground, booking: booking1 } = await createCampgroundAndBooking(user1._id);
    const booking2 = await createBooking(user2._id, campground._id);

    // user1 creates review rating=4
    const res1 = await createReview(campground._id, token1, booking1._id, { rating: 4, comment: 'Nice!' });
    expect(res1.status).toBe(201);
    const reviewId1 = res1.body.data._id;

    // user2 creates review rating=2
    const res2 = await createReview(campground._id, token2, booking2._id, { rating: 2, comment: 'Okay.' });
    expect(res2.status).toBe(201);

    // delete user1's review (rating=4)
    const deleteRes = await request(app)
      .delete(`/api/v1/reviews/${reviewId1}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(deleteRes.status).toBe(200);

    // verify stats: sumRating=2, countReview=1
    const campgroundRes = await request(app)
      .get(`/api/v1/campgrounds/${campground._id}`);

    expect(campgroundRes.body.data.sumRating).toBe(2);
    expect(campgroundRes.body.data.countReview).toBe(1);
  });
});

// ─── TC-8: Delete review → ratingCount array updates correctly ────────────────

describe('TC-6: Delete review decreases correct ratingCount bucket', () => {
  it('should return 200 and ratingCount[rating-1] decreases by 1', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const createRes = await createReview(campground._id, token, booking._id, { rating: 5, comment: 'Perfect!' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const campgroundRes = await request(app)
      .get(`/api/v1/campgrounds/${campground._id}`);

    expect(campgroundRes.body.data.ratingCount[4]).toBe(0);
  });
});


// ─── TC-9: ratingCount never goes below 0 ────────────────────────────────────

describe('TC-7: ratingCount does not go below 0 after deletion', () => {
  it('should return 200 and ratingCount values remain >= 0', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const createRes = await createReview(campground._id, token, booking._id, { rating: 3, comment: 'Average.' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    const campgroundRes = await request(app)
      .get(`/api/v1/campgrounds/${campground._id}`);

    campgroundRes.body.data.ratingCount.forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── TC-10: sumRating never goes below 0 ──────────────────────────────────────

describe('TC-8: sumRating does not go below 0 after deletion', () => {
  it('should return 200 and sumRating remains >= 0', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const createRes = await createReview(campground._id, token, booking._id, { rating: 1, comment: 'Bad.' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${token}`);

    const campgroundRes = await request(app)
      .get(`/api/v1/campgrounds/${campground._id}`);

    expect(campgroundRes.body.data.sumRating).toBeGreaterThanOrEqual(0);
  });
});

