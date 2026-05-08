const scorer   = require('./scorer');
const blocker  = require('./blocker');
const mlScorer = require('./mlScorer');
const env      = require('../../config/env');
const logger   = require('../../utils/logger');

const THROTTLE_THRESHOLD = env.abuse.scoreThreshold * 0.6;
const BLOCK_THRESHOLD    = env.abuse.scoreThreshold;
const ML_BLOCK_SCORE     = 70; // ML score above this triggers block

// ══════════════════════════════════════════════════════════════
// Main detection pipeline
// 1. Rule-based scoring (existing signals)
// 2. ML-based anomaly scoring (new)
// 3. Combined decision
// ══════════════════════════════════════════════════════════════

const detect = async (req, statusCode = 200, redisClient = null) => {
  try {
    const ip = req.ip || '0.0.0.0';

    // ── run rule-based and ML scoring in parallel ──────────
    const [ruleResult, mlResult] = await Promise.all([
      scorer.score(req, statusCode, redisClient),
      mlScorer.getMLScore(ip),
    ]);

    const ruleScore = ruleResult.score;
    const mlScore   = mlResult?.score || 0;
    const mlAnomaly = mlResult?.anomaly || false;

    // ── combine scores ─────────────────────────────────────
    // rule score counts 60%, ML score counts 40%
    const combinedScore = Math.round((ruleScore * 0.6) + (mlScore * 0.4));

    logger.debug({
      ip,
      ruleScore,
      mlScore,
      mlAnomaly,
      combinedScore,
    }, 'Detection scores');

    // ── build signal map ───────────────────────────────────
    const signals = { ...ruleResult.signals };
    if (mlAnomaly) {
      signals['mlAnomaly'] = Math.round(mlScore);
    }

    // ── immediate block — IP in blocklist ──────────────────
    if (ruleResult.signals['ipBlocklist'] === 100) {
      return { action: 'block', score: combinedScore, signals };
    }

    // ── ML flagged as anomaly with high confidence ─────────
    if (mlAnomaly && mlScore >= ML_BLOCK_SCORE) {
      const userId = req.user?._id || null;
      await blocker.blockIP(
        ip,
        { score: combinedScore, signals },
        userId,
        redisClient
      );
      return { action: 'block', score: combinedScore, signals };
    }

    // ── combined score above block threshold ───────────────
    if (combinedScore >= BLOCK_THRESHOLD) {
      const userId = req.user?._id || null;
      await blocker.blockIP(
        ip,
        { score: combinedScore, signals },
        userId,
        redisClient
      );
      return { action: 'block', score: combinedScore, signals };
    }

    // ── combined score above throttle threshold ────────────
    if (combinedScore >= THROTTLE_THRESHOLD) {
      const userId = req.user?._id || null;
      await blocker.throttleIP(ip, { score: combinedScore, signals }, userId);
      return { action: 'throttle', score: combinedScore, signals };
    }

    return { action: 'allow', score: combinedScore, signals };

  } catch (err) {
    logger.error({ err }, 'Detection pipeline error');
    return { action: 'allow', score: 0 };
  }
};

module.exports = { detect, ...blocker };