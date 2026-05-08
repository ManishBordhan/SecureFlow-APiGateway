const APIKey     = require('../models/APIKey');
const AbuseEvent = require('../models/AbuseEvent');
const logger     = require('../utils/logger');

// ══════════════════════════════════════════════════════════════
// Deactivate expired API keys
// Runs on a schedule — called from server.js
// ══════════════════════════════════════════════════════════════
const deactivateExpiredKeys = async () => {
  try {
    const result = await APIKey.updateMany(
      {
        isActive:  true,
        expiresAt: { $lt: new Date() },
      },
      { isActive: false }
    );

    if (result.modifiedCount > 0) {
      logger.info({ count: result.modifiedCount }, 'Expired API keys deactivated');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to deactivate expired API keys');
  }
};

// ══════════════════════════════════════════════════════════════
// Mark old unresolved abuse events as resolved
// Cleans up events older than 7 days
// ══════════════════════════════════════════════════════════════
const cleanupOldAbuseEvents = async () => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await AbuseEvent.updateMany(
      {
        resolved:  false,
        createdAt: { $lt: sevenDaysAgo },
      },
      {
        resolved:   true,
        resolvedAt: new Date(),
      }
    );

    if (result.modifiedCount > 0) {
      logger.info({ count: result.modifiedCount }, 'Old abuse events auto-resolved');
    }
  } catch (err) {
    logger.error({ err }, 'Failed to cleanup old abuse events');
  }
};

// ══════════════════════════════════════════════════════════════
// Start all jobs on a schedule
// ══════════════════════════════════════════════════════════════
const startJobs = () => {
  // run immediately on startup
  deactivateExpiredKeys();
  cleanupOldAbuseEvents();

  // then every hour
  setInterval(deactivateExpiredKeys, 60 * 60 * 1000);

  // then every 24 hours
  setInterval(cleanupOldAbuseEvents, 24 * 60 * 60 * 1000);

  logger.info('Background jobs started');
};

module.exports = { startJobs, deactivateExpiredKeys, cleanupOldAbuseEvents };