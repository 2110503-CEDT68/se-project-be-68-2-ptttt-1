/**
 * Test Suite: Delete Campground (US1-3)
 *
 * DELETE /api/v1/campgrounds/:id
 * Access: admin only (requires JWT + role=admin)
 *
 * TC grouping:
 *   [Auth]                TC-1 – TC-2
 *   [Valid Input]         TC-3
 *   [Invalid ID]          TC-4 – TC-5
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Campground = require('../models/Campground');
const { createUserAndToken } = require('./helpers/authHelper');

// ─── Shared test data & helpers ──────────────────────────────────────────────

const createTestCampground = async () => {
  return await Campground.create({
    name: 'Campground to Delete',
    address: '999 Delete Road',
    tel: '0811111111',
    picture: 'http://example.com/delete_pic.jpg'
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
      .delete(`/api/v1/campgrounds/${campground._id}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── TC-2: Non-admin delete the campground ────────────────────────────────────

describe('TC-2: Non-admin delete the campground', () => {
  it('should return 403', async () => {
    const { token } = await createUserAndToken('user');
    const campground = await createTestCampground();

    const res = await request(app)
      .delete(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Valid Input
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-3: Campground ID is a valid string ────────────────────────────────────

describe('TC-3: Campground ID is a valid string', () => {
  it('should return 200 and delete the campground', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();

    const res = await request(app)
      .delete(`/api/v1/campgrounds/${campground._id.toString()}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({});

    // Verify it is actually deleted from DB
    const checkCampground = await Campground.findById(campground._id);
    expect(checkCampground).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Invalid ID
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-4: Campground ID is empty or null ─────────────────────────────────────

describe('TC-4: Campground ID is empty or null', () => {
  it('should return error when passing "null" as ID', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .delete('/api/v1/campgrounds/null')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when ID is completely empty', async () => {
    const { token } = await createUserAndToken('admin');

    const res = await request(app)
      .delete('/api/v1/campgrounds/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── TC-5: Campground ID does not exist ───────────────────────────────────────

describe('TC-5: Campground ID does not exist', () => {
  it('should return 400', async () => {
    const { token } = await createUserAndToken('admin');
    const nonExistentId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/v1/campgrounds/${nonExistentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-6: Server error during deleteCampground ───────────────────────────────

describe('TC-6: Server error during deleteCampground', () => {
  it('should return 400 with success false when database operation fails', async () => {
    const { token } = await createUserAndToken('admin');
    const campground = await createTestCampground();
    const Campground = require('../models/Campground');
    
    // Mock Campground.findById to throw an error
    const originalFindById = Campground.findById;
    Campground.findById = jest.fn().mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const res = await request(app)
      .delete(`/api/v1/campgrounds/${campground._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Restore original implementation
    Campground.findById = originalFindById;
  });
});