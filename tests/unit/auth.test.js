const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const express  = require('express');
const request  = require('supertest');

// ── minimal express app for testing ───────────────────────────
const app = express();
app.use(express.json());
app.use('/auth', require('../../src/routes/auth'));

beforeAll(async () => {
  // close any existing connection first
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  await mongoose.connect('mongodb://localhost:27017/gateway_test_auth', {
    serverSelectionTimeoutMS: 10000,
  });
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
}, 20000);

// ══════════════════════════════════════════════════════════════
// Registration
// ══════════════════════════════════════════════════════════════
describe('POST /auth/register', () => {

  it('registers a new user and returns token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test2@example.com' });

    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'User', email: 'short@example.com', password: '123' });

    expect(res.status).toBe(400);
  });

});

// ══════════════════════════════════════════════════════════════
// Login
// ══════════════════════════════════════════════════════════════
describe('POST /auth/login', () => {

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects non-existent email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

});

// ══════════════════════════════════════════════════════════════
// API Key generation
// ══════════════════════════════════════════════════════════════
describe('POST /auth/keys', () => {

  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    token = res.body.data.token;
  });

  it('generates an API key for authenticated user', async () => {
    const res = await request(app)
      .post('/auth/keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'Test Key' });

    expect(res.status).toBe(201);
    expect(res.body.data.apiKey).toMatch(/^gw_/);
    expect(res.body.data.message).toContain('Store this key safely');
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app)
      .post('/auth/keys')
      .send({ label: 'No Auth Key' });

    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .post('/auth/keys')
      .set('Authorization', 'Bearer invalidtoken123')
      .send({ label: 'Bad Token Key' });

    expect(res.status).toBe(401);
  });

});