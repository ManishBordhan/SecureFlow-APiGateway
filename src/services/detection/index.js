const scorer      = require('./scorer');
const blocker     = require('./blocker');
const mlScorer    = require('./mlScorer');
const { getConfig } = require('../configService');
const logger      = require('../../utils/logger');

const detect = async (req, statusCode = 200, redisClient = null) => {
  try {
    const config = await getConfig();
    const ip     = req.ip || '0.0.0.0';

    const BLOCK_THRESHOLD    = config.abuseThreshold;
    const THROTTLE_THRESHOLD = Math.round(config.abuseThreshold * 0.6);

    // run rule-based and ML scoring in parallel
    const [ruleResult, mlResult] = await Promise.all([
      scorer.score(req, statusCode, redisClient, config.signals),
      config.mlEnabled ? mlScorer.getMLScore(ip, config.mlModel) : Promise.resolve(null),
    ]);

    const ruleScore = ruleResult.score;
    const mlScore   = mlResult?.score   || 0;
    const mlAnomaly = mlResult?.anomaly || false;

    const ruleWeight = config.ruleWeight || 0.6;
    const mlWeight   = config.mlWeight   || 0.4;
    const combined   = Math.round((ruleScore * ruleWeight) + (mlScore * mlWeight));

    logger.debug({ ip, ruleScore, mlScore, combined }, 'Detection scores');

    const signals = { ...ruleResult.signals };
    if (mlAnomaly) signals['mlAnomaly'] = Math.round(mlScore);

    if (ruleResult.signals['ipBlocklist'] === 100) {
      return { action: 'block', score: combined, signals };
    }

    if (mlAnomaly && mlScore >= 70) {
      await blocker.blockIP(ip, { score: combined, signals }, req.user?._id || null, redisClient);
      return { action: 'block', score: combined, signals };
    }

    if (combined >= BLOCK_THRESHOLD) {
      await blocker.blockIP(ip, { score: combined, signals }, req.user?._id || null, redisClient);
      return { action: 'block', score: combined, signals };
    }

    if (combined >= THROTTLE_THRESHOLD) {
      await blocker.throttleIP(ip, { score: combined, signals }, req.user?._id || null);
      return { action: 'throttle', score: combined, signals };
    }

    return { action: 'allow', score: combined, signals };

  } catch (err) {
    logger.error({ err }, 'Detection pipeline error');
    return { action: 'allow', score: 0 };
  }
};

module.exports = { detect, ...blocker };