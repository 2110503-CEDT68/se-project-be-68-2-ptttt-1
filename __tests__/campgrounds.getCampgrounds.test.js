/**
 * Test Suite: Get All Campgrounds (US1-4)
 *
 * GET /api/v1/campgrounds
 * Access: Public (no JWT required)
 *
 * Focus: listing campgrounds + pagination / sort / select / filter behavior
 *
 * TC grouping:
 *   [Empty / Basic]      TC-1 – TC-3
 *   [Pagination]         TC-4 – TC-6
 *   [Sort]               TC-7 – TC-8
 *   [Filter]             TC-9
 *   [Select fields]      TC-10
 */

require('./setup');

const request = require('supertest');
const app = require('../app');
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

// Seed N campgrounds with predictable, sortable names.
const seedCampgrounds = async (n) => {
  const created = [];
  for (let i = 0; i < n; i++) {
    const camp = await Campground.create({
      // zero-padded so lexical sort matches numeric order
      name: `Camp ${String(i).padStart(3, '0')}`,
      address: `${i} Forest Road`,
      tel: `081${String(i).padStart(7, '0')}`,
      picture: 'https://example.com/img.jpg',
    });
    created.push(camp);
  }
  return created;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1 — Empty / Basic
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-1: Empty database ────────────────────────────────────────────────────

describe('TC-1: Empty database', () => {
  it('should return 200 with count 0 and empty data array', async () => {
    const res = await request(app).get('/api/v1/campgrounds');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(0);
    expect(res.body.data).toEqual([]);
  });
});

// ─── TC-2: Public access — no token required ─────────────────────────────────

describe('TC-2: Public access (no token)', () => {
  it('should return 200 even without Authorization header', async () => {
    await createCampground();

    const res = await request(app).get('/api/v1/campgrounds');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── TC-3: Single campground in DB ───────────────────────────────────────────

describe('TC-3: Single campground in DB', () => {
  it('should return 200 with count 1 and the campground in data', async () => {
    const created = await createCampground({ name: 'Solo Camp' });

    const res = await request(app).get('/api/v1/campgrounds');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Solo Camp');
    expect(res.body.data[0]._id).toBe(created._id.toString());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2 — Pagination
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-4: Pagination — page 1 with limit ────────────────────────────────────

describe('TC-4: Pagination — page=1 limit=2', () => {
  it('should return the first 2 items and a "next" pagination cursor', async () => {
    await seedCampgrounds(5);

    const res = await request(app).get('/api/v1/campgrounds?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.next).toEqual({ page: 2, limit: 2 });
    expect(res.body.pagination.prev).toBeUndefined();
  });
});

// ─── TC-5: Pagination — middle page ──────────────────────────────────────────

describe('TC-5: Pagination — page=2 limit=2 (middle page)', () => {
  it('should return next 2 items and both prev/next cursors', async () => {
    await seedCampgrounds(5);

    const res = await request(app).get('/api/v1/campgrounds?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.pagination.next).toEqual({ page: 3, limit: 2 });
    expect(res.body.pagination.prev).toEqual({ page: 1, limit: 2 });
  });
});

// ─── TC-6: Pagination — last page ────────────────────────────────────────────

describe('TC-6: Pagination — page=3 limit=2 (last page)', () => {
  it('should return last 1 item and only "prev" cursor (no "next")', async () => {
    await seedCampgrounds(5);

    const res = await request(app).get('/api/v1/campgrounds?page=3&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.pagination.next).toBeUndefined();
    expect(res.body.pagination.prev).toEqual({ page: 2, limit: 2 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3 — Sort
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-7: Sort by _id descending (newest first via ObjectId) ────────────────
//
// Note: the Campground schema doesn't have timestamps, so the controller's
// default `-createdAt` sort is effectively a no-op. This case tests an
// explicit `-_id` sort, which IS deterministic because ObjectId encodes
// creation time in its leading bytes.

describe('TC-7: Sort by _id descending (?sort=-_id)', () => {
  it('should return the most recently created campground first', async () => {
    const first = await createCampground({ name: 'First Camp' });
    await new Promise((r) => setTimeout(r, 20));
    const second = await createCampground({ name: 'Second Camp' });

    const res = await request(app).get('/api/v1/campgrounds?sort=-_id');

    expect(res.status).toBe(200);
    expect(res.body.data[0]._id).toBe(second._id.toString());
    expect(res.body.data[1]._id).toBe(first._id.toString());
  });
});

// ─── TC-8: Sort by name ascending ────────────────────────────────────────────

describe('TC-8: Sort by name ascending (?sort=name)', () => {
  it('should return campgrounds in alphabetical order by name', async () => {
    await createCampground({ name: 'Charlie Camp' });
    await createCampground({ name: 'Alpha Camp' });
    await createCampground({ name: 'Bravo Camp' });

    const res = await request(app).get('/api/v1/campgrounds?sort=name');

    expect(res.status).toBe(200);
    const names = res.body.data.map((c) => c.name);
    expect(names).toEqual(['Alpha Camp', 'Bravo Camp', 'Charlie Camp']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4 — Filter
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-9: Filter by exact field value ───────────────────────────────────────

describe('TC-9: Filter by exact tel value', () => {
  it('should return only the campground matching the tel filter', async () => {
    await createCampground({ name: 'A', tel: '0811111111' });
    await createCampground({ name: 'B', tel: '0822222222' });
    await createCampground({ name: 'C', tel: '0833333333' });

    const res = await request(app).get('/api/v1/campgrounds?tel=0822222222');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.data[0].name).toBe('B');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 5 — Select fields
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-10: Select specific fields only ──────────────────────────────────────

describe('TC-10: Select specific fields (?select=name,tel)', () => {
  it('should return only requested fields plus _id', async () => {
    await createCampground({ name: 'Selective Camp', tel: '0844444444' });

    const res = await request(app).get('/api/v1/campgrounds?select=name,tel');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    const item = res.body.data[0];
    expect(item.name).toBe('Selective Camp');
    expect(item.tel).toBe('0844444444');
    // address and picture should NOT be present
    expect(item.address).toBeUndefined();
    expect(item.picture).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 6 — Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-11: Server error during getCampgrounds ────────────────────────────────

describe('TC-11: Server error during getCampgrounds', () => {
  it('should return 400 with success false when database query fails', async () => {
    const Campground = require('../models/Campground');
    
    // Mock Campground.find to throw an error
    const originalFind = Campground.find;
    Campground.find = jest.fn().mockImplementationOnce(() => {
      throw new Error('Database connection failed');
    });

    const res = await request(app).get('/api/v1/campgrounds');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Restore original implementation
    Campground.find = originalFind;
  });
});
// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 7 — Advanced Query Features
// ═══════════════════════════════════════════════════════════════════════════════

// ─── TC-12: Query with operators (gt, gte, lt, lte, in) ───────────────────────

describe('TC-12: Query with operators to test replace function', () => {
  it('should handle query operators like gt, gte, lt, lte, in', async () => {
    await createCampground({ name: 'Test Camp', tel: '0811111111' });

    // This will trigger the replace function for operators
    const res = await request(app).get('/api/v1/campgrounds?tel[in]=0811111111,0822222222');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── TC-13: Query with all removeFields to test forEach ───────────────────────

describe('TC-13: Query with all removeFields to test forEach function', () => {
  it('should remove select, sort, page, limit from query and process them separately', async () => {
    await createCampground({ name: 'Test Camp 2', tel: '0833333333' });

    // This will trigger the forEach function to remove fields
    const res = await request(app).get('/api/v1/campgrounds?select=name&sort=name&page=1&limit=5&tel=0833333333');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    // Should only return name field due to select=name
    expect(res.body.data[0].name).toBe('Test Camp 2');
    expect(res.body.data[0].address).toBeUndefined();
  });
});