const express            = require('express');
const { forwardRequest } = require('../services/proxy/proxyService');
const { authenticate }   = require('../middleware/auth');
const requestLogger      = require('../middleware/requestLogger');
const rateLimiter        = require('../middleware/rateLimiter');
const abuseDetection     = require('../middleware/abuseDetection');
const { error }          = require('../utils/response');
const { HTTP_STATUS }    = require('../constants');
const logger             = require('../utils/logger');

const router = express.Router();

// ── middleware chain ───────────────────────────────────────────
router.use(requestLogger);
router.use(abuseDetection);
router.use(authenticate);
router.use(rateLimiter);

// ── catch-all proxy — only forwards /proxy/* routes ───────────
router.all('*', async (req, res) => {
  try {
    await forwardRequest(req, res);
  } catch (err) {
    logger.error({ err, path: req.path }, 'Proxy error');

    if (err.message === 'Upstream request timed out') {
      return error(res, 'Upstream service timed out', HTTP_STATUS.BAD_GATEWAY);
    }

    return error(res, 'Failed to reach upstream service', HTTP_STATUS.BAD_GATEWAY);
  }
});

module.exports = router;