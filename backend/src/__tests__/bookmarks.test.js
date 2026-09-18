const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const bookmarkRoutes = require('../routes/bookmarks');

const app = express();
app.use(express.json());
app.use('/api/bookmarks', bookmarkRoutes);

const prisma = new PrismaClient();

let testUser;
let token;
let otherToken;
let createdBookmarkId;

beforeAll(async () => {
  testUser = await prisma.user.create({
    data: {
      email: `jestbm_${Date.now()}@example.com`,
      password: 'hashed_placeholder',
    },
  });
  token = jwt.sign({ userId: testUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const otherUser = await prisma.user.create({
    data: {
      email: `jestother_${Date.now()}@example.com`,
      password: 'hashed_placeholder',
    },
  });
  otherToken = jwt.sign({ userId: otherUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  await prisma.bookmark.deleteMany({ where: { userId: testUser.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [testUser.id] } },
  });
  await prisma.$disconnect();
});

describe('Bookmarks API', () => {
  it('rejects requests with no auth token', async () => {
    const res = await request(app).get('/api/bookmarks');
    expect(res.statusCode).toBe(401);
  });

  it('creates a bookmark for the logged-in user', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com', title: 'Example', description: 'A test site' });

    expect(res.statusCode).toBe(201);
    expect(res.body.title).toBe('Example');
    createdBookmarkId = res.body.id;
  });

  it('rejects creating a bookmark with an invalid URL', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'not-a-url', title: 'Bad' });

    expect(res.statusCode).toBe(400);
  });

  it('lists bookmarks for the logged-in user', async () => {
    const res = await request(app)
      .get('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('updates a bookmark successfully (owner)', async () => {
    const createRes = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://update-me.com', title: 'Before Update' });

    const res = await request(app)
      .put(`/api/bookmarks/${createRes.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://updated.com', title: 'After Update', description: 'Updated' });

    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('After Update');
  });

  it('rejects update from a non-owner', async () => {
    const createRes = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://protected.com', title: 'Protected' });

    const res = await request(app)
      .put(`/api/bookmarks/${createRes.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ url: 'https://hacked.com', title: 'Hacked' });

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 when updating a nonexistent bookmark', async () => {
    const res = await request(app)
      .put('/api/bookmarks/999999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://nowhere.com', title: 'Nowhere' });

    expect(res.statusCode).toBe(404);
  });

  it("prevents another user from deleting someone else's bookmark", async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${createdBookmarkId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('returns 404 when deleting a nonexistent bookmark', async () => {
    const res = await request(app)
      .delete('/api/bookmarks/999999999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
  });

  it('allows the owner to delete their own bookmark', async () => {
    const res = await request(app)
      .delete(`/api/bookmarks/${createdBookmarkId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
  });
});