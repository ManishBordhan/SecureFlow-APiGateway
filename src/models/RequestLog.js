const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema(
  {
    requestId: {
      type:  String,
      index: true,
    },

    ip: {
      type:  String,
      index: true,
    },

    userId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'User',
      index: true,
    },

    apiKeyId: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'APIKey',
      index: true,
    },

    method: {
      type: String,
    },

    path: {
      type: String,
    },

    statusCode: {
      type: Number,
    },

    latencyMs: {
      type: Number,
    },

    userAgent: {
      type: String,
    },

    bytesIn: {
      type: Number,
    },

    bytesOut: {
      type: Number,
    },
  },
  {
    timestamps: true,   // createdAt used for TTL
    versionKey: false,
  }
);

// ── Auto-delete logs after 30 days ─────────────────────────────
requestLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// ── Compound indexes for abuse detection queries ────────────────
requestLogSchema.index({ ip: 1, createdAt: -1 });
requestLogSchema.index({ userId: 1, statusCode: 1, createdAt: -1 });

module.exports = mongoose.model('RequestLog', requestLogSchema);