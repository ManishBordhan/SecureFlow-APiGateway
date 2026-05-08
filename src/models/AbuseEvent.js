const mongoose = require('mongoose');
const { ABUSE_ACTIONS } = require('../constants');

const abuseEventSchema = new mongoose.Schema(
  {
    ip: {
      type:  String,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    score: {
      type: Number,
    },

    signals: {
      type: Map,
      of:   Number, // e.g. { rateSurge: 30, repeatedErrors: 20 }
    },

    action: {
      type: String,
      enum: Object.values(ABUSE_ACTIONS),
    },

    resolved: {
      type:    Boolean,
      default: false,
      index:   true,
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model('AbuseEvent', abuseEventSchema);