const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const User   = require('../models/User');
const APIKey = require('../models/APIKey');
const { success, error } = require('../utils/response');
const { HTTP_STATUS }    = require('../constants');
const logger             = require('../utils/logger');

// ══════════════════════════════════════════════════════════════
// Helper — sign JWT
// ══════════════════════════════════════════════════════════════
const signToken = (userId) => {
  return jwt.sign(
    { id: userId },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

// ══════════════════════════════════════════════════════════════
// POST /auth/register
// ══════════════════════════════════════════════════════════════
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return error(res, 'Name, email and password are required', HTTP_STATUS.BAD_REQUEST);
    }

    if (password.length < 8) {
      return error(res, 'Password must be at least 8 characters', HTTP_STATUS.BAD_REQUEST);
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return error(res, 'Email already registered', HTTP_STATUS.BAD_REQUEST);
    }

    const user  = await User.create({ name, email, password });
    const token = signToken(user._id);

    logger.info({ userId: user._id }, 'New user registered');

    return success(res, {
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        plan:  user.plan,
        role:  user.role,
      },
    }, HTTP_STATUS.CREATED);

  } catch (err) {
    logger.error({ err }, 'Register error');
    return error(res, 'Registration failed', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /auth/login
// ══════════════════════════════════════════════════════════════
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 'Email and password are required', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.isActive) {
      return error(res, 'Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return error(res, 'Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    // update last login
    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user._id);

    logger.info({ userId: user._id }, 'User logged in');

    return success(res, {
      token,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        plan:  user.plan,
        role:  user.role,
      },
    });

  } catch (err) {
    logger.error({ err }, 'Login error');
    return error(res, 'Login failed', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /auth/keys — generate API key (requires JWT auth)
// ══════════════════════════════════════════════════════════════
const generateAPIKey = async (req, res) => {
  try {
    const { label } = req.body;

    const { rawKey, keyHash, keyPrefix } = APIKey.generateKey();

    const apiKey = await APIKey.create({
      keyHash,
      keyPrefix,
      userId: req.user._id,
      label:  label || 'My API Key',
      plan:   req.user.plan,
    });

    logger.info({ userId: req.user._id, keyId: apiKey._id }, 'API key generated');

    // rawKey shown ONCE — never stored in plaintext
    return success(res, {
      message:   'Store this key safely — it will not be shown again',
      apiKey:    rawKey,
      keyPrefix: apiKey.keyPrefix,
      label:     apiKey.label,
      plan:      apiKey.plan,
      expiresAt: apiKey.expiresAt,
    }, HTTP_STATUS.CREATED);

  } catch (err) {
    logger.error({ err }, 'Generate API key error');
    return error(res, 'Failed to generate API key', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// GET /auth/keys — list user's API keys
// ══════════════════════════════════════════════════════════════
const listAPIKeys = async (req, res) => {
  try {
    const keys = await APIKey.find({ userId: req.user._id })
      .select('-keyHash')   // never expose the hash
      .sort({ createdAt: -1 });

    return success(res, { keys });

  } catch (err) {
    logger.error({ err }, 'List API keys error');
    return error(res, 'Failed to fetch API keys', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// DELETE /auth/keys/:id — revoke an API key
// ══════════════════════════════════════════════════════════════
const revokeAPIKey = async (req, res) => {
  try {
    const apiKey = await APIKey.findOne({
      _id:    req.params.id,
      userId: req.user._id,
    });

    if (!apiKey) {
      return error(res, 'API key not found', HTTP_STATUS.NOT_FOUND);
    }

    apiKey.isActive = false;
    await apiKey.save();

    logger.info({ keyId: apiKey._id }, 'API key revoked');

    return success(res, { message: 'API key revoked successfully' });

  } catch (err) {
    logger.error({ err }, 'Revoke API key error');
    return error(res, 'Failed to revoke API key', HTTP_STATUS.INTERNAL_ERROR);
  }
};

module.exports = {
  register,
  login,
  generateAPIKey,
  listAPIKeys,
  revokeAPIKey,
};