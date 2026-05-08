const mongoose = require('mongoose');

// ── connect to a test database ─────────────────────────────────
beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  await mongoose.connect('mongodb://localhost:27017/gateway_test', {
    serverSelectionTimeoutMS: 10000,
  });
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
}, 20000);

// ══════════════════════════════════════════════════════════════
// User model
// ══════════════════════════════════════════════════════════════
describe('User model', () => {

  const User = require('../../src/models/User');

  it('creates a user with hashed password', async () => {
  const user = await User.create({
    name:     'Test User',
    email:    'test@example.com',
    password: 'password123',
  });

  expect(user._id).toBeDefined();
  expect(user.email).toBe('test@example.com');
  // password is hashed — not plaintext
  expect(user.password).not.toBe('password123');
  // select: false works on queries, not on create()
  expect(user.password).toMatch(/^\$2[ab]\$/);
  expect(user.plan).toBe('free');
  expect(user.role).toBe('user');
});

  it('rejects duplicate email', async () => {
    await expect(
      User.create({
        name:     'Duplicate User',
        email:    'test@example.com',
        password: 'password123',
      })
    ).rejects.toThrow();
  });

  it('rejects invalid email format', async () => {
    await expect(
      User.create({
        name:     'Bad Email',
        email:    'not-an-email',
        password: 'password123',
      })
    ).rejects.toThrow();
  });

  it('comparePassword returns true for correct password', async () => {
    const user = await User.findOne({ email: 'test@example.com' }).select('+password');
    const isMatch = await user.comparePassword('password123');
    expect(isMatch).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const user = await User.findOne({ email: 'test@example.com' }).select('+password');
    const isMatch = await user.comparePassword('wrongpassword');
    expect(isMatch).toBe(false);
  });

});

// ══════════════════════════════════════════════════════════════
// APIKey model
// ══════════════════════════════════════════════════════════════
describe('APIKey model', () => {

  const APIKey = require('../../src/models/APIKey');
  const User   = require('../../src/models/User');

  let userId;

  beforeAll(async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    userId = user._id;
  });

  it('generates a valid raw key and hash', () => {
    const { rawKey, keyHash, keyPrefix } = APIKey.generateKey();

    expect(rawKey).toMatch(/^gw_/);
    expect(rawKey.length).toBeGreaterThan(20);
    expect(keyHash).toHaveLength(64);       // sha256 hex
    expect(keyPrefix).toHaveLength(8);
  });

  it('creates an API key document', async () => {
    const { rawKey, keyHash, keyPrefix } = APIKey.generateKey();

    const apiKey = await APIKey.create({
      keyHash,
      keyPrefix,
      userId,
      label: 'Test Key',
      plan:  'free',
    });

    expect(apiKey._id).toBeDefined();
    expect(apiKey.isActive).toBe(true);
    expect(apiKey.plan).toBe('free');
  });

  it('hashKey produces consistent hash', () => {
    const raw   = 'gw_testrawinputstring';
    const hash1 = APIKey.hashKey(raw);
    const hash2 = APIKey.hashKey(raw);
    expect(hash1).toBe(hash2);
  });

  it('isExpired returns false when no expiresAt', async () => {
    const apiKey = await APIKey.findOne({ userId });
    expect(apiKey.isExpired()).toBe(false);
  });

  it('isExpired returns true for past date', async () => {
    const { keyHash, keyPrefix } = APIKey.generateKey();
    const expired = await APIKey.create({
      keyHash,
      keyPrefix,
      userId,
      expiresAt: new Date('2000-01-01'), // past date
    });
    expect(expired.isExpired()).toBe(true);
  });

});

// ══════════════════════════════════════════════════════════════
// RequestLog model
// ══════════════════════════════════════════════════════════════
describe('RequestLog model', () => {

  const RequestLog = require('../../src/models/RequestLog');

  it('creates a request log document', async () => {
    const log = await RequestLog.create({
      requestId:  'req-001',
      ip:         '127.0.0.1',
      method:     'GET',
      path:       '/api/users',
      statusCode: 200,
      latencyMs:  45,
      userAgent:  'Mozilla/5.0',
      bytesIn:    120,
      bytesOut:   340,
    });

    expect(log._id).toBeDefined();
    expect(log.statusCode).toBe(200);
    expect(log.ip).toBe('127.0.0.1');
  });

});

// ══════════════════════════════════════════════════════════════
// AbuseEvent model
// ══════════════════════════════════════════════════════════════
describe('AbuseEvent model', () => {

  const AbuseEvent = require('../../src/models/AbuseEvent');

  it('creates an abuse event document', async () => {
    const event = await AbuseEvent.create({
      ip:     '192.168.1.1',
      score:  85,
      signals: {
        rateSurge:      30,
        repeatedErrors: 20,
        uaRotation:     15,
        payloadAnomaly: 20,
      },
      action: 'blocked',
    });

    expect(event._id).toBeDefined();
    expect(event.score).toBe(85);
    expect(event.action).toBe('blocked');
    expect(event.resolved).toBe(false);
  });

  it('rejects invalid action value', async () => {
    await expect(
      AbuseEvent.create({
        ip:     '192.168.1.2',
        score:  50,
        action: 'invalidAction',
      })
    ).rejects.toThrow();
  });

});