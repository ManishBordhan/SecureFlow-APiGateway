const tokenBucket   = require('./tokenBucket');
const slidingWindow = require('./slidingWindow');
const fixedWindow   = require('./fixedWindow');
const env           = require('../../config/env');
const logger        = require('../../utils/logger');
const { RATE_LIMIT_ALGORITHMS } = require('../../constants');

// ── plan-based limits ──────────────────────────────────────────
const PLAN_LIMITS = {
  free:       { max: 30,   windowMs: 60000 },
  pro:        { max: 100,  windowMs: 60000 },
  enterprise: { max: 1000, windowMs: 60000 },
};

// ── select algorithm from env ──────────────────────────────────
const getAlgorithm = () => {
  switch (env.rateLimit.algorithm) {
    case RATE_LIMIT_ALGORITHMS.SLIDING_WINDOW:
      return slidingWindow;
    case RATE_LIMIT_ALGORITHMS.FIXED_WINDOW:
      return fixedWindow;
    case RATE_LIMIT_ALGORITHMS.TOKEN_BUCKET:
    default:
      return tokenBucket;
  }
};

// ── main consume function ──────────────────────────────────────
const consume = async (identifier, plan = 'free', algorithmOverride = null) => {
  const limits    = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const algorithm = algorithmOverride
    ? { tokenBucket, slidingWindow, fixedWindow }[algorithmOverride]
    : getAlgorithm();

  if (!algorithm) {
    logger.warn({ algorithmOverride }, 'Unknown algorithm — falling back to tokenBucket');
    return tokenBucket.consume(identifier, limits);
  }

  return algorithm.consume(identifier, limits);
};

module.exports = { consume, PLAN_LIMITS };