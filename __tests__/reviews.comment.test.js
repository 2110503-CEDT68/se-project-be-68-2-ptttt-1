/**
 * Test Suite: Comment the Campground (US2-1 / US2-2)
 *
 * POST /api/v1/campgrounds/:campgroundId/reviews
 * Access: authenticated user (requires JWT)
 *
 * Focus: comment validation + booking ownership / duplicate handling
 *
 * TC grouping:
 *   [Auth]                TC-1
 *   [Valid Comment]       TC-2 – TC-6
 *   [Invalid Comment]     TC-7 – TC-11
 *   [Booking & Duplicate] TC-12 – TC-13
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const { createUserAndToken } = require('./helpers/authHelper');
const {
  createCampgroundAndBooking,
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
// GROUP 2 — Valid Comment Values
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-2: Normal comment text ───────────────────────────────────────────────

describe('TC-2: Normal comment text', () => {
  it('should return 201 and store the comment', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: 'Lovely place to stay.' }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment).toBe('Lovely place to stay.');
  });
});

// ─── TC-3: Single character comment ──────────────────────────────────────────

describe('TC-3: Single character comment "A"', () => {
  it('should return 201 (minlength is 1)', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: 'A' }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment).toBe('A');
  });
});

// ─── TC-4: Comment with exactly 1000 characters ──────────────────────────────

describe('TC-4: Comment with exactly 1000 characters', () => {
  it('should return 201 (boundary value)', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const longComment = 'a'.repeat(1000);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: longComment }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment.length).toBe(1000);
  });
});

// ─── TC-5: Comment with leading/trailing whitespace ──────────────────────────

describe('TC-5: Comment with leading/trailing whitespace', () => {
  it('should return 201 and trim the comment', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: '   Nice and quiet.   ' }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment).toBe('Nice and quiet.');
  });
});

// ─── TC-6: Comment with special characters and newlines ──────────────────────

describe('TC-6: Comment with special characters and newlines', () => {
  it('should return 201 and preserve content', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const comment = 'Great spot! 🏕️\nWould visit again — 5/5.';

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment }));

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment).toBe(comment);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Invalid Comment Values
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-7: Comment exceeds 1000 characters ───────────────────────────────────

describe('TC-7: Comment exceeds 1000 characters (1001 chars)', () => {
  it('should return 400 with "must not exceed" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const tooLong = 'a'.repeat(1001);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: tooLong }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/must not exceed/i);
  });
});

// ─── TC-8: Missing comment field ─────────────────────────────────────────────

describe('TC-8: Missing comment field', () => {
  it('should return 400 with "provide a comment" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const payload = buildReviewPayload(booking._id);
    delete payload.comment;

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a comment/i);
  });
});

// ─── TC-9: Empty string comment ──────────────────────────────────────────────

describe('TC-9: Empty string comment', () => {
  it('should return 400 with "provide a comment" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: '' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a comment/i);
  });
});

// ─── TC-10: Whitespace-only comment ──────────────────────────────────────────

describe('TC-10: Whitespace-only comment', () => {
  it('should return 400 with "provide a comment" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: '     ' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a comment/i);
  });
});

// ─── TC-11: Comment = null ───────────────────────────────────────────────────

describe('TC-11: Comment = null', () => {
  it('should return 400 with "provide a comment" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: null }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a comment/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-14: Campground not found ──────────────────────────────────────────────

describe('TC-14: Campground not found', () => {
  it('should return 404 with "Campground not found" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { booking } = await createCampgroundAndBooking(user._id);
    
    const mongoose = require('mongoose');
    const nonExistentCampgroundId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/v1/campgrounds/${nonExistentCampgroundId}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: 'Test comment' }));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/Campground not found/i);
  });
});

// ─── TC-15: Booking not found ─────────────────────────────────────────────────

describe('TC-15: Booking not found', () => {
  it('should return 404 with "Booking not found" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground } = await createCampgroundAndBooking(user._id);
    
    const mongoose = require('mongoose');
    const nonExistentBookingId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(nonExistentBookingId, { comment: 'Test comment' }));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/Booking not found/i);
  });
});

// ─── TC-16: Booking doesn't belong to user ────────────────────────────────────

describe('TC-16: Booking does not belong to current user', () => {
  it('should return 403 with "Not authorized" message', async () => {
    const { user: user1 } = await createUserAndToken('user');
    const { user: user2, token: token2 } = await createUserAndToken('user');
    const { campground, booking: booking1 } = await createCampgroundAndBooking(user1._id);

    // user2 tries to review user1's booking
    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token2}`)
      .send(buildReviewPayload(booking1._id, { comment: 'Test comment' }));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/Not authorized to review this booking/i);
  });
});

// ─── TC-17: Booking doesn't belong to campground ──────────────────────────────

describe('TC-17: Booking does not belong to this campground', () => {
  it('should return 400 with "does not belong to this campground" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground: campground1, booking: booking1 } = await createCampgroundAndBooking(user._id);
    const { campground: campground2 } = await createCampgroundAndBooking(user._id);

    // Try to review campground2 with booking1 (which belongs to campground1)
    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground2._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking1._id, { comment: 'Test comment' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/does not belong to this campground/i);
  });
});

// ─── TC-18: Server error during review creation ───────────────────────────────

describe('TC-18: Server error during review creation', () => {
  it('should return 400 with "Server error" message when database operation fails', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);
    
    const Review = require('../models/Review');
    
    // Mock Review.create to throw an error
    const originalCreate = Review.create;
    Review.create = jest.fn().mockRejectedValueOnce(new Error('Database connection failed'));

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: 'Test comment' }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toBe('Server error');

    // Restore original implementation
    Review.create = originalCreate;
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 5 — Booking Ownership & Duplicate
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-12: Missing booking ID ───────────────────────────────────────────────

describe('TC-12: Missing booking ID', () => {
  it('should return 400 with "provide a booking ID" message', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground } = await createCampgroundAndBooking(user._id);

    const payload = buildReviewPayload(undefined);
    delete payload.booking;

    const res = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.msg).toMatch(/provide a booking/i);
  });
});

// ─── TC-13: Duplicate review on same booking ─────────────────────────────────

describe('TC-13: Duplicate review on the same booking', () => {
  it('should return 400 with "already reviewed" message on second submission', async () => {
    const { user, token } = await createUserAndToken('user');
    const { campground, booking } = await createCampgroundAndBooking(user._id);

    // first review — should succeed
    const first = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: 'First review' }));

    expect(first.status).toBe(201);

    // second review — same booking — should fail
    const second = await request(app)
      .post(`/api/v1/campgrounds/${campground._id}/reviews`)
      .set('Authorization', `Bearer ${token}`)
      .send(buildReviewPayload(booking._id, { comment: 'Second review' }));

    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.msg).toMatch(/already reviewed/i);
  });
});
