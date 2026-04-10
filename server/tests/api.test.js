import request from 'supertest';
import { app } from '../src/index.js';

describe('GET /api/roms', () => {
  test('returns 200 and a roms array', async () => {
    const res = await request(app).get('/api/roms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.roms)).toBe(true);
    expect(typeof res.body.count).toBe('number');
    expect(res.body.count).toBeGreaterThan(0);
  });

  test('each rom entry has required fields', async () => {
    const res = await request(app).get('/api/roms');
    const first = res.body.roms[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('filename');
    expect(first).toHaveProperty('region');
  });
});

describe('GET /api/roms/search', () => {
  test('returns matching roms for query "pitfall"', async () => {
    const res = await request(app).get('/api/roms/search?q=pitfall');
    expect(res.status).toBe(200);
    expect(res.body.roms.length).toBeGreaterThan(0);
    res.body.roms.forEach((r) => {
      expect(r.title.toLowerCase()).toContain('pitfall');
    });
  });

  test('returns empty array for empty query', async () => {
    const res = await request(app).get('/api/roms/search?q=');
    expect(res.status).toBe(200);
    expect(res.body.roms).toEqual([]);
  });

  test('returns empty array for nonexistent title', async () => {
    const res = await request(app).get('/api/roms/search?q=zzznobodywillname');
    expect(res.status).toBe(200);
    expect(res.body.roms.length).toBe(0);
  });
});

describe('GET /api/roms/:id — security', () => {
  test('rejects path traversal attempt', async () => {
    const res = await request(app).get('/api/roms/..%2F..%2Fetc%2Fpasswd');
    expect([400, 403, 404]).toContain(res.status);
  });

  test('rejects non-.bin extension', async () => {
    const res = await request(app).get('/api/roms/somefile.exe');
    expect(res.status).toBe(400);
  });

  test('returns 404 for nonexistent ROM', async () => {
    const res = await request(app).get('/api/roms/DoesNotExist.bin');
    expect(res.status).toBe(404);
  });
});

describe('GET unknown route', () => {
  test('returns 404', async () => {
    const res = await request(app).get('/totally-unknown');
    expect(res.status).toBe(404);
  });
});
