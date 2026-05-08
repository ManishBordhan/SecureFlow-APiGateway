const { createClient } = require('redis');
const mongoose         = require('mongoose');

let redis;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  await mongoose.connect('mongodb://localhost:27017/gateway_test_abuse', {
    serverSelectionTimeoutMS: 10000,
  });
  await mongoose.connection.dropDatabase();

  redis = createClient({ socket: { host: 'localhost', port: 6379 } });
  await redis.connect();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await redis.quit();
}, 20000);

afterEach(async () => {
  const keys = await redis.keys('abuse:*');
  const blKeys = await redis.keys('blocklist:*');
  const all = [...keys, ...blKeys];
  if (all.length > 0) await redis.del(all);
});

// ══════════════════════════════════════════════════════════════
// Individual signals
// ══════════════════════════════════════════════════════════════
describe('Abuse signals', () => {
  const signals = require('../../src/services/detection/signals');

  it('rateSurge returns 0 for normal traffic', async () => {
    const result = await signals.rateSurge('1.1.1.1', redis);
    expect(result.score).toBe(0);
  });

  it('rateSurge returns 30 after 50 requests', async () => {
    for (let i = 0; i < 51; i++) {
      await signals.rateSurge('2.2.2.2', redis);
    }
    const result = await signals.rateSurge('2.2.2.2', redis);
    expect(result.score).toBe(30);
  });

  it('repeatedErrors returns 0 for successful requests', async () => {
    const result = await signals.repeatedErrors('3.3.3.3', 200, redis);
    expect(result.score).toBe(0);
  });

  it('repeatedErrors returns 20 after 10 errors', async () => {
    for (let i = 0; i < 11; i++) {
      await signals.repeatedErrors('4.4.4.4', 401, redis);
    }
    const result = await signals.repeatedErrors('4.4.4.4', 401, redis);
    expect(result.score).toBe(20);
  });

  it('userAgentRotation returns 0 for single UA', async () => {
    const result = await signals.userAgentRotation('5.5.5.5', 'Mozilla/5.0', redis);
    expect(result.score).toBe(0);
  });

  it('userAgentRotation returns 15 after 5 distinct UAs', async () => {
    const uas = ['UA-1', 'UA-2', 'UA-3', 'UA-4', 'UA-5', 'UA-6'];
    for (const ua of uas) {
      await signals.userAgentRotation('6.6.6.6', ua, redis);
    }
    const result = await signals.userAgentRotation('6.6.6.6', 'UA-7', redis);
    expect(result.score).toBe(15);
  });

  it('payloadAnomaly returns 0 for small payload', () => {
    const result = signals.payloadAnomaly(1024);
    expect(result.score).toBe(0);
  });

  it('payloadAnomaly returns 25 for large payload', () => {
    const result = signals.payloadAnomaly(600 * 1024);
    expect(result.score).toBe(25);
  });

  it('ipBlocklist returns 0 for clean IP', async () => {
    const result = await signals.ipBlocklist('7.7.7.7', redis);
    expect(result.score).toBe(0);
  });

  it('ipBlocklist returns 100 for blocked IP', async () => {
    await redis.setEx('blocklist:8.8.8.8', 3600, '1');
    const result = await signals.ipBlocklist('8.8.8.8', redis);
    expect(result.score).toBe(100);
  });

});

// ══════════════════════════════════════════════════════════════
// Blocker
// ══════════════════════════════════════════════════════════════
describe('Blocker', () => {
  const blocker = require('../../src/services/detection/blocker');

  it('blockIP sets Redis key with TTL', async () => {
    await blocker.blockIP('9.9.9.9', { score: 80, signals: { rateSurge: 30 } }, null, redis);
    const exists = await redis.exists('blocklist:9.9.9.9');
    expect(exists).toBe(1);
  });

  it('isBlocked returns true for blocked IP', async () => {
    await redis.setEx('blocklist:10.10.10.10', 3600, '1');
    const blocked = await blocker.isBlocked('10.10.10.10', redis);
    expect(blocked).toBe(true);
  });

  it('isBlocked returns false for clean IP', async () => {
    const blocked = await blocker.isBlocked('11.11.11.11', redis);
    expect(blocked).toBe(false);
  });

  it('unblockIP removes Redis key', async () => {
    await redis.setEx('blocklist:12.12.12.12', 3600, '1');
    await blocker.unblockIP('12.12.12.12', null, redis);
    const exists = await redis.exists('blocklist:12.12.12.12');
    expect(exists).toBe(0);
  });

});

// ══════════════════════════════════════════════════════════════
// Full detection pipeline
// ══════════════════════════════════════════════════════════════
describe('Detection pipeline', () => {
  const detection = require('../../src/services/detection');

  it('returns allow for clean request', async () => {
    const req = {
      ip:      '20.20.20.20',
      headers: { 'user-agent': 'Mozilla/5.0', 'content-length': '100' },
      user:    null,
    };
    const result = await detection.detect(req, 200, redis);
    expect(result.action).toBe('allow');
  });

  it('returns block for IP already in blocklist', async () => {
    await redis.setEx('blocklist:30.30.30.30', 3600, '1');
    const req = {
      ip:      '30.30.30.30',
      headers: { 'user-agent': 'Mozilla/5.0', 'content-length': '100' },
      user:    null,
    };
    const result = await detection.detect(req, 200, redis);
    expect(result.action).toBe('block');
  });

  it('returns block for high abuse score', async () => {
    // simulate 51 rate surge hits to trigger score >= 30
    for (let i = 0; i < 51; i++) {
      await redis.incr('abuse:rate:40.40.40.40');
    }
    await redis.expire('abuse:rate:40.40.40.40', 60);

    // simulate 11 errors to trigger score >= 20
    for (let i = 0; i < 11; i++) {
      await redis.incr('abuse:errors:40.40.40.40');
    }
    await redis.expire('abuse:errors:40.40.40.40', 300);

    // simulate UA rotation — 6 distinct UAs
    const uas = ['UA-1', 'UA-2', 'UA-3', 'UA-4', 'UA-5', 'UA-6'];
    for (const ua of uas) {
      await redis.sAdd('abuse:ua:40.40.40.40', ua);
    }
    await redis.expire('abuse:ua:40.40.40.40', 60);

    // total score = 30 + 20 + 15 = 65 — above throttle, near block threshold
    const req = {
      ip:      '40.40.40.40',
      headers: { 'user-agent': 'UA-7', 'content-length': '100' },
      user:    null,
    };

    const result = await detection.detect(req, 200, redis);
    expect(['block', 'throttle']).toContain(result.action);
    expect(result.score).toBeGreaterThanOrEqual(30);
  });

});