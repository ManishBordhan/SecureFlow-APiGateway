const mongoose = require('mongoose');
const express  = require('express');
const http     = require('http');
const request  = require('supertest');
const nock     = require('nock');

const app = express();
app.use(express.json());
app.use('/auth', require('../../src/routes/auth'));
app.use('/',     require('../../src/routes/proxy'));

let server;
let token;
let apiKey;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  await mongoose.connect('mongodb://localhost:27017/gateway_test_proxy', {
    serverSelectionTimeoutMS: 10000,
  });
  await mongoose.connection.dropDatabase();

  // allow real connections only to localhost
  nock.enableNetConnect('127.0.0.1');

  // mock jsonplaceholder responses
  nock('https://jsonplaceholder.typicode.com')
    .get('/posts/1')
    .reply(200, { id: 1, title: 'Post One', body: 'body', userId: 1 })
    .persist();

  nock('https://jsonplaceholder.typicode.com')
    .get('/posts/2')
    .reply(200, { id: 2, title: 'Post Two', body: 'body', userId: 1 })
    .persist();

  nock('https://jsonplaceholder.typicode.com')
    .get('/todos/1')
    .reply(200, { id: 1, title: 'Todo One', completed: false, userId: 1 })
    .persist();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  // register
  const reg = await request(server)
    .post('/auth/register')
    .send({ name: 'Proxy User', email: 'proxy@example.com', password: 'password123' });

  token = reg.body.data.token;

  // generate API key
  const keyRes = await request(server)
    .post('/auth/keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ label: 'Proxy Test Key' });

  apiKey = keyRes.body.data.apiKey;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await new Promise((resolve) => server.close(resolve));
}, 20000);

// ══════════════════════════════════════════════════════════════
// Auth layer — these never hit upstream
// ══════════════════════════════════════════════════════════════
describe('Proxy auth layer', () => {

  it('rejects request with no credentials', async () => {
    const res = await request(server)
      .get('/posts/1');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects request with invalid token', async () => {
    const res = await request(server)
      .get('/posts/1')
      .set('Authorization', 'Bearer badtoken');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects request with invalid API key', async () => {
    const res = await request(server)
      .get('/posts/1')
      .set('x-api-key', 'gw_invalidkeyvalue');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

});

// ══════════════════════════════════════════════════════════════
// Request logger — verified without hitting upstream
// ══════════════════════════════════════════════════════════════
describe('Request logger middleware', () => {

  it('attaches x-request-id to every response', async () => {
    const res = await request(server)
      .get('/posts/1');

    // x-request-id is set before auth runs — always present
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

});

// ══════════════════════════════════════════════════════════════
// Proxy forwarding — mocked upstream
// ══════════════════════════════════════════════════════════════
describe('Proxy forwarding', () => {

  it('forwards GET /posts/1 with JWT and returns mocked data', async () => {
    const res = await request(server)
      .get('/posts/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.title).toBe('Post One');
  });

  it('forwards GET /posts/2 with API key and returns mocked data', async () => {
    const res = await request(server)
      .get('/posts/2')
      .set('x-api-key', apiKey);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(2);
  });

  it('forwards GET /todos/1 and returns mocked todo', async () => {
    const res = await request(server)
      .get('/todos/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('title');
    expect(res.body.title).toBe('Todo One');
  });

});