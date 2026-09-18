const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const prisma = new PrismaClient();

const testEmail = `jesttest_${Date.now()}@example.com`;
const testPassword = 'testpassword123';

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: testEmail } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('rejects registration with an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: testPassword });

    expect(res.statusCode).toBe(400);
  });

  it('rejects registration with a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: `short_${Date.now()}@example.com`, password: '123' });

    expect(res.statusCode).toBe(400);
  });

  it('rejects duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
  });

  it('rejects login for nonexistent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doesnotexist@example.com', password: testPassword });

    expect(res.statusCode).toBe(401);
  });
});