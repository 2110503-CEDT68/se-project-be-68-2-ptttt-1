/**
 * Test Suite: Rating the Campground (US2-1 / US2-2)
 *
 * POST /api/v1/campgrounds/:campgroundId/reviews
 * Access: authenticated user (requires JWT)
 *
 * Focus: rating value validation + campground stats update
 *
 * TC grouping:
 *   [Auth]            TC-1
 *   [Valid Rating]    TC-2 – TC-5
 *   [Stats Update]    TC-6 – TC-7
 *   [Invalid Rating]  TC-8 – TC-14
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const Campground = require('../models/Campground');
const { createUserAndToken } = require('./helpers/authHelper');
const {
  createCampgroundAndBooking,
  createBooking,
  buildReviewPayload,
} = require('./helpers/reviewHelper');

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Authentication
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: No authentication token ───────────────────────────────────────────

describe('TC-1: No authentication token', () => {
  it('should return 401', async () => {
    const { user } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .send(buildReviewPayload(booking._id));

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Valid Rating Values
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-2: Rating = 1 (minimum) ──────────────────────────────────────────────

describe('TC-2: Rating = 1 (minimum valid)', () => {
  it('should return 201 and create the review', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 1 }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(1);
  });
});

// ─── TC-3: Rating = 3 (middle) ───────────────────────────────────────────────

describe('TC-3: Rating = 3 (middle valid)', () => {
  it('should return 201 and create the review', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 3 }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(3);
  });
});

// ─── TC-4: Rating = 5 (maximum) ──────────────────────────────────────────────

describe('TC-4: Rating = 5 (maximum valid)', () => {
  it('should return 201 and create the review', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 5 }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(5);
  });
});

// ─── TC-5: Rating as numeric string "4" ──────────────────────────────────────

describe('TC-5: Rating as numeric string "4"', () => {
  it('should return 201 (coerced to integer 4)', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: '4' }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Campground Stats Update
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-6: ratingCount index updates correctly ───────────────────────────────

describe('TC-6: Campground stats update after a 4-star review', () => {
  it('should increment sumRating, countReview, and ratingCount[3]', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 4 }));

    expect(res.status).toBe(201);

    const updated = await Campground.findById(campground._id);
    expect(updated.sumRating).toBe(4);
    expect(updated.countReview).toBe(1);
    expect(updated.ratingCount[3]).toBe(1);
    expect(updated.ratingCount[0]).toBe(0);
    expect(updated.ratingCount[1]).toBe(0);
    expect(updated.ratingCount[2]).toBe(0);
    expect(updated.ratingCount[4]).toBe(0);
  });
});

// ─── TC-7: Two reviews accumulate stats ──────────────────────────────────────

describe('TC-7: Stats accumulate across two reviews on same campground', () => {
  it('should sum ratings and counts correctly', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking: booking1 } = await createCampgroundAndBooking(user._id);
    const booking2 = await createBooking(user._id, campground._id);

    await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking1._id, { rating: 5 }));

    await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking2._id, { rating: 3 }));

    const updated = await Campground.findById(campground._id);
    expect(updated.sumRating).toBe(8);
    expect(updated.countReview).toBe(2);
    expect(updated.ratingCount[4]).toBe(1); // 5-star
    expect(updated.ratingCount[2]).toBe(1); // 3-star
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Invalid Rating Values
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-8: Rating = 0 ────────────────────────────────────────────────────────

describe('TC-8: Rating = 0', () => {
  it('should return 400 with "provide a rating" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 0 }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a rating/i);
  });
});

// ─── TC-9: Rating = 6 (above max) ────────────────────────────────────────────

describe('TC-9: Rating = 6 (above max)', () => {
  it('should return 400 with "between 1 and 5" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 6 }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/between 1 and 5/i);
  });
});

// ─── TC-10: Rating = -1 (negative) ───────────────────────────────────────────

describe('TC-10: Rating = -1 (negative)', () => {
  it('should return 400 with "between 1 and 5" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: -1 }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/between 1 and 5/i);
  });
});

// ─── TC-11: Rating = 1.5 (non-integer) ───────────────────────────────────────

describe('TC-11: Rating = 1.5 (non-integer)', () => {
  it('should return 400 with "between 1 and 5" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 1.5 }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/between 1 and 5/i);
  });
});

// ─── TC-12: Rating = "abc" (non-numeric string) ──────────────────────────────

describe('TC-12: Rating = "abc" (non-numeric string)', () => {
  it('should return 400 with "between 1 and 5" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: 'abc' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/between 1 and 5/i);
  });
});

// ─── TC-13: Rating = null ────────────────────────────────────────────────────

describe('TC-13: Rating = null', () => {
  it('should return 400 with "provide a rating" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { rating: null }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a rating/i);
  });
});

// ─── TC-14: Missing rating field ─────────────────────────────────────────────

describe('TC-14: Missing rating field', () => {
  it('should return 400 with "provide a rating" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const payload = buildReviewPayload(booking._id);
    delete payload.rating;

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a rating/i);
  });
});
