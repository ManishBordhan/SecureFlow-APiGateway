const rateLimiter    = require('../services/rateLimiter');
const { error }      = require('../utils/response');
const logger         = require('../utils/logger');
const { HTTP_STATUS } = require('../constants');

const rateLimitMiddleware = async (req, res, next) => {
  try {
    // identify by userId if authed, otherwise by IP
    const identifier = req.user
      ? `user:${req.user._id}`
      : `ip:${req.ip}`;

    const plan   = req.user?.plan || 'free';
    const result = await rateLimiter.consume(identifier, plan);

    // ── set standard rate limit headers ───────────────────
    res.setHeader('x-ratelimit-limit',     result.capacity);
    res.setHeader('x-ratelimit-remaining', Math.max(0, result.tokensLeft));
    res.setHeader('x-ratelimit-algorithm', result.algorithm);

    if (!result.allowed) {
      logger.warn({ identifier, plan, algorithm: result.algorithm }, 'Rate limit exceeded');

      return error(
        res,
        'Too many requests — rate limit exceeded',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        {
          algorithm:  result.algorithm,
          retryAfter: '60 seconds',
        }
      );
    }

    next();

  } catch (err) {
    logger.error({ err }, 'Rate limiter middleware error');
    // fail open — never block a request due to limiter failure
    next();
  }
};

module.exports = rateLimitMiddleware;