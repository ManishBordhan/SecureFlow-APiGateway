const tokenBucket   = require('./tokenBucket');
const slidingWindow = require('./slidingWindow');
const fixedWindow   = require('./fixedWindow');
const { getConfig } = require('../configService');
const logger        = require('../../utils/logger');

const getAlgorithm = (algorithmName) => {
  switch (algorithmName) {
    case 'slidingWindow': return slidingWindow;
    case 'fixedWindow':   return fixedWindow;
    case 'tokenBucket':
    default:              return tokenBucket;
  }
};

const consume = async (identifier, plan = 'free', redisClient = null) => {
  try {
    const config    = await getConfig();
    const limits    = config.planLimits?.[plan] || config.planLimits?.free;
    const algorithm = getAlgorithm(config.algorithm);
    return algorithm.consume(identifier, limits, redisClient);
  } catch (err) {
    logger.error({ err }, 'Rate limiter config error — using tokenBucket default');
    return tokenBucket.consume(identifier, { max: 100, windowMs: 60000 }, redisClient);
  }
};

// Keep PLAN_LIMITS export for backward compatibility
const PLAN_LIMITS = {
  free:       { max: 30,   windowMs: 60000 },
  pro:        { max: 100,  windowMs: 60000 },
  enterprise: { max: 1000, windowMs: 60000 },
};

module.exports = { consume, PLAN_LIMITS };