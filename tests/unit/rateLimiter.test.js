const { createClient } = require('redis');

let redis;

beforeAll(async () => {
  redis = createClient({
    socket: { host: 'localhost', port: 6379 },
  });
  await redis.connect();
});

afterAll(async () => {
  await redis.quit();
});

afterEach(async () => {
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) await redis.del(keys);
});

// ══════════════════════════════════════════════════════════════
// Token Bucket
// ══════════════════════════════════════════════════════════════
describe('Token bucket', () => {
  const { consume } = require('../../src/services/rateLimiter/tokenBucket');

  it('allows first request', async () => {
    const result = await consume('test-user-tb', { capacity: 5, refillRate: 1 }, redis);
    expect(result.allowed).toBe(true);
    expect(result.algorithm).toBe('tokenBucket');
  });

  it('blocks when bucket is empty', async () => {
    for (let i = 0; i < 5; i++) {
      await consume('test-drain-tb', { capacity: 5, refillRate: 1 }, redis);
    }
    const result = await consume('test-drain-tb', { capacity: 5, refillRate: 1 }, redis);
    expect(result.allowed).toBe(false);
    expect(result.tokensLeft).toBe(0);
  });

  it('tracks tokens remaining correctly', async () => {
    await consume('test-track-tb', { capacity: 10, refillRate: 1 }, redis);
    await consume('test-track-tb', { capacity: 10, refillRate: 1 }, redis);
    await consume('test-track-tb', { capacity: 10, refillRate: 1 }, redis);
    const result = await consume('test-track-tb', { capacity: 10, refillRate: 1 }, redis);
    expect(result.tokensLeft).toBe(6);
  });

  it('different identifiers have independent buckets', async () => {
    for (let i = 0; i < 3; i++) {
      await consume('user-a-tb', { capacity: 3, refillRate: 1 }, redis);
    }
    const resultA = await consume('user-a-tb', { capacity: 3, refillRate: 1 }, redis);
    const resultB = await consume('user-b-tb', { capacity: 3, refillRate: 1 }, redis);
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

});

// ══════════════════════════════════════════════════════════════
// Sliding Window
// ══════════════════════════════════════════════════════════════
describe('Sliding window', () => {
  const { consume } = require('../../src/services/rateLimiter/slidingWindow');

  it('allows first request', async () => {
    const result = await consume('test-user-sw', { windowMs: 60000, max: 5 }, redis);
    expect(result.allowed).toBe(true);
    expect(result.algorithm).toBe('slidingWindow');
  });

  it('blocks when limit is reached', async () => {
    for (let i = 0; i < 5; i++) {
      await consume('test-drain-sw', { windowMs: 60000, max: 5 }, redis);
    }
    const result = await consume('test-drain-sw', { windowMs: 60000, max: 5 }, redis);
    expect(result.allowed).toBe(false);
    expect(result.tokensLeft).toBe(0);
  });

  it('tracks remaining correctly', async () => {
    await consume('test-track-sw', { windowMs: 60000, max: 10 }, redis);
    await consume('test-track-sw', { windowMs: 60000, max: 10 }, redis);
    await consume('test-track-sw', { windowMs: 60000, max: 10 }, redis);
    const result = await consume('test-track-sw', { windowMs: 60000, max: 10 }, redis);
    expect(result.tokensLeft).toBe(6);
  });

  it('different identifiers are independent', async () => {
    for (let i = 0; i < 3; i++) {
      await consume('user-a-sw', { windowMs: 60000, max: 3 }, redis);
    }
    const resultA = await consume('user-a-sw', { windowMs: 60000, max: 3 }, redis);
    const resultB = await consume('user-b-sw', { windowMs: 60000, max: 3 }, redis);
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

});

// ══════════════════════════════════════════════════════════════
// Fixed Window
// ══════════════════════════════════════════════════════════════
describe('Fixed window', () => {
  const { consume } = require('../../src/services/rateLimiter/fixedWindow');

  it('allows first request', async () => {
    const result = await consume('test-user-fw', { windowMs: 60000, max: 5 }, redis);
    expect(result.allowed).toBe(true);
    expect(result.algorithm).toBe('fixedWindow');
  });

  it('blocks when limit is reached', async () => {
    for (let i = 0; i < 5; i++) {
      await consume('test-drain-fw', { windowMs: 60000, max: 5 }, redis);
    }
    const result = await consume('test-drain-fw', { windowMs: 60000, max: 5 }, redis);
    expect(result.allowed).toBe(false);
    expect(result.tokensLeft).toBe(0);
  });

  it('tracks remaining correctly', async () => {
    await consume('test-track-fw', { windowMs: 60000, max: 10 }, redis);
    await consume('test-track-fw', { windowMs: 60000, max: 10 }, redis);
    await consume('test-track-fw', { windowMs: 60000, max: 10 }, redis);
    const result = await consume('test-track-fw', { windowMs: 60000, max: 10 }, redis);
    expect(result.tokensLeft).toBe(6);
  });

  it('different identifiers are independent', async () => {
    for (let i = 0; i < 3; i++) {
      await consume('user-a-fw', { windowMs: 60000, max: 3 }, redis);
    }
    const resultA = await consume('user-a-fw', { windowMs: 60000, max: 3 }, redis);
    const resultB = await consume('user-b-fw', { windowMs: 60000, max: 3 }, redis);
    expect(resultA.allowed).toBe(false);
    expect(resultB.allowed).toBe(true);
  });

});

// ══════════════════════════════════════════════════════════════
// Algorithm selector
// ══════════════════════════════════════════════════════════════
describe('Rate limiter index — algorithm selector', () => {
  const { PLAN_LIMITS } = require('../../src/services/rateLimiter');

  it('free plan has lower cap than pro', () => {
    expect(PLAN_LIMITS.free.max).toBeLessThan(PLAN_LIMITS.pro.max);
  });

  it('pro plan has lower cap than enterprise', () => {
    expect(PLAN_LIMITS.pro.max).toBeLessThan(PLAN_LIMITS.enterprise.max);
  });

});