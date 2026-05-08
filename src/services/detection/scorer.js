const signals = require('./signals');
const logger  = require('../../utils/logger');

// ══════════════════════════════════════════════════════════════
// Aggregates all signal scores into a single abuse score
// Returns score, individual signals, and whether to block
// ══════════════════════════════════════════════════════════════

const score = async (req, statusCode = 200, redisClient = null) => {
  const ip        = req.ip || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const bytesIn   = parseInt(req.headers['content-length']) || 0;

  // run all signals in parallel for performance
  const [
    rateSurgeResult,
    repeatedErrorsResult,
    uaRotationResult,
    payloadAnomalyResult,
    ipBlocklistResult,
  ] = await Promise.all([
    signals.rateSurge(ip, redisClient),
    signals.repeatedErrors(ip, statusCode, redisClient),
    signals.userAgentRotation(ip, userAgent, redisClient),
    Promise.resolve(signals.payloadAnomaly(bytesIn)),
    signals.ipBlocklist(ip, redisClient),
  ]);

  const results = [
    rateSurgeResult,
    repeatedErrorsResult,
    uaRotationResult,
    payloadAnomalyResult,
    ipBlocklistResult,
  ];

  // build signal map — only include signals that fired
  const signalMap = {};
  let totalScore  = 0;

  for (const result of results) {
    if (result.score > 0) {
      signalMap[result.signal] = result.score;
      totalScore += result.score;
    }
  }

  logger.debug({ ip, totalScore, signalMap }, 'Abuse score calculated');

  return {
    ip,
    score:   totalScore,
    signals: signalMap,
  };
};

module.exports = { score };