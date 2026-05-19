const signals  = require('./signals');
const logger   = require('../../utils/logger');

const score = async (req, statusCode = 200, redisClient = null, signalConfig = null) => {
  const ip        = req.ip || '0.0.0.0';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const bytesIn   = parseInt(req.headers['content-length']) || 0;

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

  const signalMap = {};
  let totalScore  = 0;

  for (const result of results) {
    // check if signal is enabled in config
    const signalEnabled = signalConfig
      ? signalConfig[result.signal]?.enabled !== false
      : true;

    if (result.score > 0 && signalEnabled) {
      // use config score if available, otherwise use default
      const scoreValue = signalConfig?.[result.signal]?.score || result.score;
      signalMap[result.signal] = scoreValue;
      totalScore += scoreValue;
    }
  }

  logger.debug({ ip, totalScore, signalMap }, 'Abuse score calculated');

  return { ip, score: totalScore, signals: signalMap };
};

module.exports = { score };