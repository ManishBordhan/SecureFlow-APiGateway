const { client: redis } = require('../../config/redis');
const { ABUSE_SIGNALS } = require('../../constants');

// ══════════════════════════════════════════════════════════════
// Each signal function returns a score (0 = clean, >0 = suspicious)
// All signals are independent — scored and summed by scorer.js
// ══════════════════════════════════════════════════════════════

// ── Signal 1: Rate surge ───────────────────────────────────────
// Score 30 if request rate is 5x above baseline in last 60s
const rateSurge = async (ip, redisClient = null) => {
  const r   = redisClient || redis;
  const key = `abuse:rate:${ip}`;

  try {
    const count = await r.incr(key);
    await r.expire(key, 60);

    // baseline = 10 requests per 60s — surge if over 50
    if (count > 50) return { signal: ABUSE_SIGNALS.RATE_SURGE, score: 30 };
  } catch (err) {
    // never let signal failure affect scoring
  }
  return { signal: ABUSE_SIGNALS.RATE_SURGE, score: 0 };
};

// ── Signal 2: Repeated errors ──────────────────────────────────
// Score 20 if more than 10 error responses (4xx/5xx) in 5 min
const repeatedErrors = async (ip, statusCode, redisClient = null) => {
  const r = redisClient || redis;

  if (statusCode < 400) return { signal: ABUSE_SIGNALS.REPEATED_ERRORS, score: 0 };

  const key   = `abuse:errors:${ip}`;
  const count = await r.incr(key).catch(() => 0);
  await r.expire(key, 300).catch(() => {});

  if (count > 10) return { signal: ABUSE_SIGNALS.REPEATED_ERRORS, score: 20 };
  return { signal: ABUSE_SIGNALS.REPEATED_ERRORS, score: 0 };
};

// ── Signal 3: User agent rotation ─────────────────────────────
// Score 15 if more than 5 distinct user agents from same IP in 1 min
const userAgentRotation = async (ip, userAgent, redisClient = null) => {
  const r   = redisClient || redis;
  const key = `abuse:ua:${ip}`;

  try {
    await r.sAdd(key, userAgent || 'unknown');
    await r.expire(key, 60);
    const count = await r.sCard(key);

    if (count > 5) return { signal: ABUSE_SIGNALS.UA_ROTATION, score: 15 };
  } catch (err) {}
  return { signal: ABUSE_SIGNALS.UA_ROTATION, score: 0 };
};

// ── Signal 4: Payload size anomaly ────────────────────────────
// Score 25 if request payload is unusually large (over 500KB)
const payloadAnomaly = (bytesIn) => {
  const THRESHOLD = 500 * 1024; // 500KB
  if (bytesIn > THRESHOLD) {
    return { signal: ABUSE_SIGNALS.PAYLOAD_ANOMALY, score: 25 };
  }
  return { signal: ABUSE_SIGNALS.PAYLOAD_ANOMALY, score: 0 };
};

// ── Signal 5: IP blocklist check ──────────────────────────────
// Score 100 if IP is already in the blocklist — immediate block
const ipBlocklist = async (ip, redisClient = null) => {
  const r   = redisClient || redis;
  const key = `blocklist:${ip}`;

  try {
    const blocked = await r.exists(key);
    if (blocked) return { signal: ABUSE_SIGNALS.IP_BLOCKLIST, score: 100 };
  } catch (err) {}
  return { signal: ABUSE_SIGNALS.IP_BLOCKLIST, score: 0 };
};

module.exports = {
  rateSurge,
  repeatedErrors,
  userAgentRotation,
  payloadAnomaly,
  ipBlocklist,
};