const detection       = require('../services/detection');
const { error }       = require('../utils/response');
const { emitAbuse }   = require('../sockets');
const logger          = require('../utils/logger');
const { HTTP_STATUS } = require('../constants');

const abuseDetection = async (req, res, next) => {
  try {
    const ip = req.ip;

    // ── fast path: check blocklist ─────────────────────────
    const blocked = await detection.isBlocked(ip);
    if (blocked) {
      logger.warn({ ip }, 'Blocked IP attempted request');

      emitAbuse({
        type:      'blocked_ip_attempt',
        ip,
        path:      req.path,
        timestamp: new Date().toISOString(),
      });

      return error(
        res,
        'Your IP has been blocked due to suspicious activity',
        HTTP_STATUS.FORBIDDEN
      );
    }

    // ── run detection pipeline ─────────────────────────────
    const result = await detection.detect(req, 200);

    if (result.action === 'block') {
      emitAbuse({
        type:      'new_block',
        ip,
        score:     result.score,
        signals:   result.signals,
        timestamp: new Date().toISOString(),
      });

      return error(
        res,
        'Request blocked — abuse detected',
        HTTP_STATUS.FORBIDDEN,
        { score: result.score, signals: result.signals }
      );
    }

    if (result.action === 'throttle') {
      emitAbuse({
        type:      'throttle',
        ip,
        score:     result.score,
        signals:   result.signals,
        timestamp: new Date().toISOString(),
      });
    }

    req.abuseScore = result.score;
    next();

  } catch (err) {
    logger.error({ err }, 'Abuse detection middleware error');
    next();
  }
};

module.exports = abuseDetection;