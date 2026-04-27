/**
 * Test Suite: Delete Review (US2-4)
 *
 * DELETE /api/v1/reviews/:id
 * Access: authenticated user (requires JWT)
 *
 * Focus: delete review + average rating recalculation
 *
 * TC grouping:
 *   [Auth]             TC-1
 *   [Success]          TC-2 – TC-3
 *   [Recalculation]    TC-4 – TC-6
 *   [Edge Cases]       TC-7 – TC-8
 *   [Not Found / Auth] TC-9 – TC-10
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const { createUserAndToken } = require('./helpers/authHelper');
const {
  createCampgroundAndBooking,
  buildReviewPayload,
  createBooking,
} = require('./helpers/reviewHelper');

// ─── helper: สร้าง review แล้ว return reviewId ───────────────────────────────

async function createReview(campgroundId, token, bookingId, overrides = {}) {
  const res = await request(app)
    .post(`/api/v1/campgrounds/${campgroundId}/reviews`)
    .set('Authorization', `Bearer ${token}`)
    .send(buildReviewPayload(bookingId, overrides));
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Authentication
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: No authentication token ───────────────────────────────────────────

describe('TC-1: No authentication token', () => {
  it('should return 401', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    // สร้าง review ด้วย token ที่ถูกต้องก่อน
    const createRes = await createReview(campground._id, token, booking._id, { rating: 4, comment: 'Nice!' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    // ลบโดยไม่มี token → ต้องได้ 401
    const res = await request(app)
      .delete(`/api/v1/reviews/${reviewId}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Success
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-2: Delete own review successfully ────────────────────────────────────

describe('TC-2: Delete own review successfully', () => {
  it('should return 200 and success true', async () => {
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
  });
});

// ─── TC-3: Cannot delete another user's review ───────────────────────────────

describe('TC-3: Cannot delete another user review', () => {
  it('should return 403', async () => {
    const { user: owner, token: ownerToken } = await createUserAndToken('user');
    const { user: other, token: otherToken } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(owner._id);

    const createRes = await createReview(campground._id, ownerToken, booking._id, { rating: 3, comment: 'Good.' });
    expect(createRes.status).toBe(201);
    const reviewId = createRes.body.data._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Average Rating Recalculation
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-4: Delete the only review → stats reset to zero ──────────────────────

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

// ─── TC-5: Delete one of multiple reviews → stats decrease correctly ──────────
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

// ─── TC-6: Delete review → ratingCount array updates correctly ────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Edge Cases
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-7: ratingCount never goes below 0 ────────────────────────────────────

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

// ─── TC-8: sumRating never goes below 0 ──────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 5 — Not Found
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-9: Delete review that does not exist ─────────────────────────────────

describe('TC-9: Delete review that does not exist', () => {
  it('should return 404', async () => {
    const { token } = await createUserAndToken('user');
    const fakeId = '000000000000000000000000';

    const deleteRes = await request(app)
      .delete(`/api/v1/reviews/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(404);
    expect(deleteRes.body.success).toBe(false);
  });
});