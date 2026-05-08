const env    = require('../../config/env');
const logger = require('../../utils/logger');

// ══════════════════════════════════════════════════════════════
// Calls Python ML service to get anomaly score for an IP
// Falls back gracefully if ML service is unavailable
// ══════════════════════════════════════════════════════════════

const getMLScore = async (ip) => {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const response = await fetch(`${env.ml.serviceUrl}/score`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ip }),
      signal:  controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      logger.warn({ ip }, 'ML service returned non-200');
      return null;
    }

    const data = await response.json();

    logger.debug({
      ip,
      mlScore:   data.score,
      mlAnomaly: data.anomaly,
    }, 'ML score received');

    return {
      score:   data.score,
      anomaly: data.anomaly,
      action:  data.action,
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn({ ip }, 'ML service timeout — skipping');
    } else {
      logger.warn({ err, ip }, 'ML service unavailable — skipping');
    }
    // always fail open — never block traffic due to ML service being down
    return null;
  }
};

module.exports = { getMLScore };