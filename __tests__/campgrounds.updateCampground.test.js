/**
 * Test Suite: Update Campground
 *
 * PUT /api/v1/campgrounds/:id
 * Access: admin only (requires JWT + role=admin)
 *
 * TC grouping:
 *   [Auth]                TC-1 – TC-2
 *   [Valid Input]         TC-3 – TC-4
 *   [Empty String Fields] TC-5 – TC-8
 *   [Invalid ID]          TC-9 – TC-10
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Campground = require('../models/Campground');
const { createUserAndToken } = require('./helpers/authHelper');

// ─── Shared test data & helpers ──────────────────────────────────────────────

const validUpdatePayload = {
  name: 'Updated Pine Forest Camp',
  address: '456 New Forest Road, Chiang Mai',
  tel: '0899999999',
  picture: 'https://example.com/updated_pic.jpg',
};

const createTestCampground = async () => {
  return await Campground.create({
    name: 'Original Camp',
    address: '111 Old Road',
    tel: '0800000000',
    picture: 'http://example.com/old_pic.jpg'
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Authentication & Authorization
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: No authentication token ───────────────────────────────────────────

describe('TC-1: No authentication token', () => {
  it('should return 401', async () => {
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .send(validUpdatePayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-2: Non-admin role ─────────────────────────────────────────────────────

describe('TC-2: Non-admin role', () => {
  it('should return 403', async () => {
    const { token } = await createUserAndToken('user');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(validUpdatePayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Valid Input
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-3: Update with valid data ─────────────────────────────────────────────

describe('TC-3: Update with valid data', () => {
  it('should return 200 and the updated campground', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send(validUpdatePayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(validUpdatePayload.name);
    expect(res.body.data.address).toBe(validUpdatePayload.address);
    expect(res.body.data.tel).toBe(validUpdatePayload.tel);
    expect(res.body.data.picture).toBe(validUpdatePayload.picture);
  });
});

// ─── TC-4: Update with extra unknown field ────────────────────────────────────

describe('TC-4: Update with extra field (not in schema)', () => {
  it('should return 200 and ignore unknown fields', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validUpdatePayload, unknownField: 'should be ignored' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unknownField).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Empty String Fields
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-5: Update name field to empty string ──────────────────────────────────

describe('TC-5: Update name field to empty string', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-6: Update address field to empty string ───────────────────────────────

describe('TC-6: Update address field to empty string', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ address: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-7: Update phone number field to empty string ──────────────────────────

describe('TC-7: Update phone number field to empty string', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tel: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-8: Update picture URL field to empty string ───────────────────────────

describe('TC-8: Update picture URL field to empty string', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ picture: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Invalid ID
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-9: Update with non-existent Campground ID ─────────────────────────────

describe('TC-9: Update with non-existent Campground ID', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');
    const nonExistentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .put(`/api/v1/campgrounds/${nonExistentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(validUpdatePayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-10: Update with malformed Campground ID ───────────────────────────────

describe('TC-10: Update with malformed Campground ID', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .put('/api/v1/campgrounds/invalid-id')
      .set('Authorization', `Bearer ${token}`)
      .send(validUpdatePayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
