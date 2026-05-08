const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const env        = require('../config/env');
const { client: redisClient } = require('../config/redis');
const APIKey     = require('../models/APIKey');
const User       = require('../models/User');
const { error }  = require('../utils/response');
const logger     = require('../utils/logger');
const {
  HTTP_STATUS,
  REDIS_KEYS,
} = require('../constants');

// ══════════════════════════════════════════════════════════════
// Helper — attach user to request
// ══════════════════════════════════════════════════════════════
const attachUser = (req, user, authMethod) => {
  req.user       = user;
  req.authMethod = authMethod; // 'jwt' or 'apiKey'
};

// ══════════════════════════════════════════════════════════════
// Strategy 1 — verify JWT token
// ══════════════════════════════════════════════════════════════
const verifyJWT = async (token) => {
  const decoded = jwt.verify(token, env.jwt.secret);

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) return null;

  return user;
};

// ══════════════════════════════════════════════════════════════
// Strategy 2 — verify API key with Redis cache
// ══════════════════════════════════════════════════════════════
const verifyAPIKey = async (rawKey) => {
  const keyHash   = crypto.createHash('sha256').update(rawKey).digest('hex');
  const cacheKey  = REDIS_KEYS.API_KEY_CACHE(keyHash);

  // ── check Redis cache first ──────────────────────────────
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, 'API key cache hit');
      return JSON.parse(cached);
    }
  } catch (err) {
    logger.warn({ err }, 'Redis cache read failed — falling through to DB');
  }

  // ── cache miss — query MongoDB ───────────────────────────
  const apiKey = await APIKey.findOne({ keyHash, isActive: true })
    .populate('userId', 'name email plan role isActive');

  if (!apiKey) return null;
  if (apiKey.isExpired()) return null;
  if (!apiKey.userId || !apiKey.userId.isActive) return null;

  // ── build cacheable user object ──────────────────────────
  const userPayload = {
    _id:    apiKey.userId._id,
    name:   apiKey.userId.name,
    email:  apiKey.userId.email,
    plan:   apiKey.plan,         // key-level plan overrides user plan
    role:   apiKey.userId.role,
  };

  // ── store in Redis with TTL ──────────────────────────────
  try {
    await redisClient.setEx(
      cacheKey,
      env.apiKey.cacheTtl,
      JSON.stringify(userPayload)
    );
  } catch (err) {
    logger.warn({ err }, 'Redis cache write failed — continuing without cache');
  }

  // ── update lastUsedAt without blocking the request ──────
  APIKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() })
    .catch((err) => logger.warn({ err }, 'Failed to update lastUsedAt'));

  return userPayload;
};

// ══════════════════════════════════════════════════════════════
// Main auth middleware
// ══════════════════════════════════════════════════════════════
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const apiKeyHeader = req.headers['x-api-key'];

    // ── Strategy 1: Bearer JWT ───────────────────────────────
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const user = await verifyJWT(token);
        if (!user) {
          return error(res, 'Invalid or inactive account', HTTP_STATUS.UNAUTHORIZED);
        }
        attachUser(req, user, 'jwt');
        return next();
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          return error(res, 'Token expired', HTTP_STATUS.UNAUTHORIZED);
        }
        if (err.name === 'JsonWebTokenError') {
          return error(res, 'Invalid token', HTTP_STATUS.UNAUTHORIZED);
        }
        throw err;
      }
    }

    // ── Strategy 2: API Key ──────────────────────────────────
    if (apiKeyHeader) {
      const user = await verifyAPIKey(apiKeyHeader);
      if (!user) {
        return error(res, 'Invalid or expired API key', HTTP_STATUS.UNAUTHORIZED);
      }
      attachUser(req, user, 'apiKey');
      return next();
    }

    // ── No credentials provided ──────────────────────────────
    return error(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);

  } catch (err) {
    logger.error({ err, path: req.path }, 'Auth middleware error');
    return error(res, 'Authentication failed', HTTP_STATUS.UNAUTHORIZED);
  }
};

// ══════════════════════════════════════════════════════════════
// Optional middleware — restrict to admin role only
// ══════════════════════════════════════════════════════════════
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return error(res, 'Admin access required', HTTP_STATUS.FORBIDDEN);
  }
  next();
};

module.exports = { authenticate, requireAdmin };