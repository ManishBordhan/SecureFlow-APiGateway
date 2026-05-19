const { client: redis } = require('../config/redis');
const env = require('../config/env');
const logger = require('../utils/logger');

const CONFIG_KEY = 'gateway:config';

// ── Default config (fallback if Redis has nothing) ─────────────
const DEFAULTS = {
  // Rate limiting
  algorithm:        env.rateLimit.algorithm || 'tokenBucket',
  windowMs:         env.rateLimit.windowMs  || 60000,
  maxRequests:      env.rateLimit.max       || 100,
  planLimits: {
    free:       { max: 30,   windowMs: 60000 },
    pro:        { max: 100,  windowMs: 60000 },
    enterprise: { max: 1000, windowMs: 60000 },
  },

  // Abuse detection
  abuseThreshold:   env.abuse.scoreThreshold  || 70,
  blockTtlSeconds:  env.abuse.blockTtlSeconds || 3600,
  signals: {
    rateSurge:      { enabled: true, score: 30  },
    repeatedErrors: { enabled: true, score: 20  },
    uaRotation:     { enabled: true, score: 15  },
    payloadAnomaly: { enabled: true, score: 25  },
    ipBlocklist:    { enabled: true, score: 100 },
  },

  // ML
  mlEnabled:   true,
  mlModel:     'isolationForest',
  mlWeight:    0.4,
  ruleWeight:  0.6,

  // Upstream
  upstreamUrl: env.upstream.baseUrl || 'https://jsonplaceholder.typicode.com',
};

// ── Get full config ────────────────────────────────────────────
const getConfig = async () => {
  try {
    const stored = await redis.get(CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // deep merge with defaults so new keys always exist
      return deepMerge(DEFAULTS, parsed);
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to read config from Redis — using defaults');
  }
  return { ...DEFAULTS };
};

// ── Update config (partial update supported) ───────────────────
const updateConfig = async (updates) => {
  try {
    const current = await getConfig();
    const merged  = deepMerge(current, updates);
    await redis.set(CONFIG_KEY, JSON.stringify(merged));
    logger.info({ updates }, 'Gateway config updated');
    return merged;
  } catch (err) {
    logger.error({ err }, 'Failed to update config');
    throw err;
  }
};

// ── Reset to defaults ──────────────────────────────────────────
const resetConfig = async () => {
  await redis.del(CONFIG_KEY);
  logger.info('Gateway config reset to defaults');
  return DEFAULTS;
};

// ── Deep merge helper ──────────────────────────────────────────
const deepMerge = (target, source) => {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
};

module.exports = { getConfig, updateConfig, resetConfig, DEFAULTS };