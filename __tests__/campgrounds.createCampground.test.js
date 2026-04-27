/**
 * Test Suite: Create Campground (US1-1)
 *
 * POST /api/v1/campgrounds
 * Access: admin only (requires JWT + role=admin)
 *
 * TC grouping:
 *   [Auth]                TC-1 – TC-2
 *   [Valid Input]         TC-3 – TC-4
 *   [Missing Fields]      TC-5 – TC-8
 *   [Empty String Fields] TC-9 – TC-10
 *   [Duplicate]           TC-11
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const { createUserAndToken } = require('./helpers/authHelper');

// ─── Shared test data ────────────────────────────────────────────────────────

const validPayload = {
  name: 'Pine Forest Camp',
  address: '123 Forest Road, Chiang Mai',
  tel: '0812345678',
  picture: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Authentication & Authorization
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: No authentication token ───────────────────────────────────────────

describe('TC-1: No authentication token', () => {
  it('should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/campgrounds')
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-2: Non-admin role ─────────────────────────────────────────────────────

describe('TC-2: Non-admin role', () => {
  it('should return 403', async () => {
    const { token } = await createUserAndToken('user');

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Valid Input
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-3: Create with valid data ─────────────────────────────────────────────

describe('TC-3: Create with valid data', () => {
  it('should return 201 and the created campground', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(validPayload.name);
    expect(res.body.data.address).toBe(validPayload.address);
    expect(res.body.data.tel).toBe(validPayload.tel);
    expect(res.body.data.picture).toBe(validPayload.picture);
    expect(res.body.data.sumRating).toBe(0);
    expect(res.body.data.countReview).toBe(0);
    expect(res.body.data.ratingCount).toEqual([0, 0, 0, 0, 0]);
  });
});

// ─── TC-4: Extra unknown field ────────────────────────────────────────────────

describe('TC-4: Extra unknown field', () => {
  it('should return 201 and ignore unknown fields', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, unknownField: 'should be ignored' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unknownField).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Missing Required Fields (field omitted / undefined)
//
// All four cases hit the !field early-return check in the controller
// before reaching Mongoose validation.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-5: Missing name field ─────────────────────────────────────────────────

describe('TC-5: Missing name field', () => {
  it('should return 400 with "name" in message', async () => {
    const { token } = await createUserAndToken('admin');
    const { name, ...payload } = validPayload;

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name/i);
  });
});

// ─── TC-6: Missing address field ──────────────────────────────────────────────

describe('TC-6: Missing address field', () => {
  it('should return 400 with "address" in message', async () => {
    const { token } = await createUserAndToken('admin');
    const { address, ...payload } = validPayload;

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/address/i);
  });
});

// ─── TC-7: Missing tel field ──────────────────────────────────────────────────

describe('TC-7: Missing tel field', () => {
  it('should return 400 with "tel" in message', async () => {
    const { token } = await createUserAndToken('admin');
    const { tel, ...payload } = validPayload;

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/tel/i);
  });
});

// ─── TC-8: Missing picture field ──────────────────────────────────────────────

describe('TC-8: Missing picture field', () => {
  it('should return 400 with "picture" in message', async () => {
    const { token } = await createUserAndToken('admin');
    const { picture, ...payload } = validPayload;

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/picture/i);
  });
});

// ─── TC-9: Empty string name field ────────────────────────────────────────────

describe('TC-9: Empty string name field', () => {
  it('should return 400 with "name" in message', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name/i);
  });
});

// ─── TC-10: Empty string name — Mongoose validation path ──────────────────────
describe('TC-10: Empty string name after trim (Mongoose validation path)', () => {
  it('should return 400 with "name" in message when name is whitespace-only', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validPayload, name: '   ' }); 

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name/i);
  });
});

// ─── TC-11: Duplicate campground name ─────────────────────────────────────────

describe('TC-11: Duplicate campground name', () => {
  it('should return 400 with "already exists" message', async () => {
    const { token } = await createUserAndToken('admin');

    await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-12: Generic server error during createCampground ──────────────────────

describe('TC-12: Generic server error during createCampground', () => {
  it('should return 500 with "Server error" message when unexpected error occurs', async () => {
    const { token } = await createUserAndToken('admin');
    const Campground = require('../models/Campground');
    
    // Mock Campground.create to throw a generic error (not ValidationError or duplicate key)
    const originalCreate = Campground.create;
    Campground.create = jest.fn().mockRejectedValueOnce(new Error('Unexpected database error'));

    const res = await request(app)
      .post('/api/v1/campgrounds')
      .set('Authorization', `Bearer ${token}`)
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Server error');

    // Restore original implementation
    Campground.create = originalCreate;
  });
});
