const { client: defaultRedis } = require('../../config/redis');
const AbuseEvent  = require('../../models/AbuseEvent');
const logger      = require('../../utils/logger');
const env         = require('../../config/env');
const { ABUSE_ACTIONS, REDIS_KEYS } = require('../../constants');

// ══════════════════════════════════════════════════════════════
// Blocks an IP in Redis and logs the abuse event to MongoDB
// ══════════════════════════════════════════════════════════════

const blockIP = async (ip, scoreData, userId = null, redisClient = null) => {
  const redis = redisClient || defaultRedis;
  const key   = REDIS_KEYS.IP_BLOCKLIST(ip);

  try {
    // ── block in Redis with TTL ──────────────────────────
    await redis.setEx(key, env.abuse.blockTtlSeconds, '1');

    logger.warn({ ip, score: scoreData.score }, 'IP blocked');

    // ── log to MongoDB asynchronously ────────────────────
    AbuseEvent.create({
      ip,
      userId,
      score:   scoreData.score,
      signals: scoreData.signals,
      action:  ABUSE_ACTIONS.BLOCKED,
    }).catch((err) => logger.error({ err }, 'Failed to save abuse event'));

    return true;

  } catch (err) {
    logger.error({ err, ip }, 'Failed to block IP');
    return false;
  }
};

// ══════════════════════════════════════════════════════════════
// Throttle — log event but do not block
// ══════════════════════════════════════════════════════════════
const throttleIP = async (ip, scoreData, userId = null) => {
  logger.warn({ ip, score: scoreData.score }, 'IP throttled');

  AbuseEvent.create({
    ip,
    userId,
    score:   scoreData.score,
    signals: scoreData.signals,
    action:  ABUSE_ACTIONS.THROTTLED,
  }).catch((err) => logger.error({ err }, 'Failed to save throttle event'));
};

// ══════════════════════════════════════════════════════════════
// Check if IP is currently blocked
// ══════════════════════════════════════════════════════════════
const isBlocked = async (ip, redisClient = null) => {
  const redis = redisClient || defaultRedis;
  const key   = REDIS_KEYS.IP_BLOCKLIST(ip);

  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (err) {
    logger.error({ err, ip }, 'Failed to check blocklist');
    return false;
  }
};

// ══════════════════════════════════════════════════════════════
// Unblock — used by admin dashboard
// ══════════════════════════════════════════════════════════════
const unblockIP = async (ip, adminUserId = null, redisClient = null) => {
  const redis = redisClient || defaultRedis;
  const key   = REDIS_KEYS.IP_BLOCKLIST(ip);

  try {
    await redis.del(key);
    logger.info({ ip, adminUserId }, 'IP unblocked');
    return true;
  } catch (err) {
    logger.error({ err, ip }, 'Failed to unblock IP');
    return false;
  }
};

module.exports = { blockIP, throttleIP, isBlocked, unblockIP };