const mongoose = require('mongoose');
const crypto   = require('crypto');

const apiKeySchema = new mongoose.Schema(
  {
    keyHash: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },

    keyPrefix: {
      type:     String,
      required: true, // first 8 chars of raw key — shown in dashboard
    },

    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    label: {
      type:    String,
      default: 'My API Key',
      trim:    true,
    },

    plan: {
      type:    String,
      enum:    ['free', 'pro', 'enterprise'],
      default: 'free',
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    lastUsedAt: {
      type: Date,
    },

    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Static: generate a new raw key and its hash ────────────────
apiKeySchema.statics.generateKey = function () {
  const rawKey  = `gw_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto
    .createHash('sha256')
    .update(rawKey)
    .digest('hex');
  const keyPrefix = rawKey.slice(0, 8);
  return { rawKey, keyHash, keyPrefix };
};

// ── Static: hash an incoming key for lookup ────────────────────
apiKeySchema.statics.hashKey = function (rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
};

// ── Check if key is expired ────────────────────────────────────
apiKeySchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('APIKey', apiKeySchema);