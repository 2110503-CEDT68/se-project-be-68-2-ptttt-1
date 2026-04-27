/**
 * Test Suite: Get Single Campground
 *
 * GET /api/v1/campgrounds/:id
 * Access: Public (no JWT required)
 *
 * Focus: getting a single campground by ID
 *
 * TC grouping:
 *   [Valid]   TC-1 Valid campground ID
 *   [Invalid] TC-2 Non-existent campground ID
 *   [Error]   TC-3 Server error during getCampground
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Campground = require('../models/Campground');

// ─── Shared helpers ──────────────────────────────────────────────────────────

const createCampground = async (overrides = {}) => {
  return await Campground.create({
    name: overrides.name || `Camp ${Math.random().toString(36).slice(2, 8)}`,
    address: overrides.address || '123 Test Road',
    tel: overrides.tel || '0812345678',
    picture: overrides.picture || 'https://example.com/img.jpg',
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Valid Input
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: Valid campground ID ───────────────────────────────────────────────

describe('TC-1: Valid campground ID', () => {
  it('should return 200 with the campground data', async () => {
    const created = await createCampground({ name: 'Test Camp' });

    const res = await request(app).get(`/api/v1/campgrounds/${created._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Camp');
    expect(res.body.data._id).toBe(created._id.toString());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Invalid Input
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-2: Non-existent campground ID ────────────────────────────────────────

describe('TC-2: Non-existent campground ID', () => {
  it('should return 400 with success false', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();

    const res = await request(app).get(`/api/v1/campgrounds/${nonExistentId}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-3: Server error during getCampground ──────────────────────────────────

describe('TC-3: Server error during getCampground', () => {
  it('should return 400 with success false when database query fails', async () => {
    const Campground = require('../models/Campground');
    
    // Mock Campground.findById to throw an error
    const originalFindById = Campground.findById;
    Campground.findById = jest.fn().mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const validId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/v1/campgrounds/${validId}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Restore original implementation
    Campground.findById = originalFindById;
  });
});
