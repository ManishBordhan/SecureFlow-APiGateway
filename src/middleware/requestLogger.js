const RequestLog          = require('../models/RequestLog');
const logger              = require('../utils/logger');
const { emitTraffic }     = require('../sockets');

const requestLogger = async (req, res, next) => {
  req.requestId = require('crypto').randomUUID();
  req.startTime = Date.now();

  res.setHeader('x-request-id', req.requestId);

  res.on('finish', async () => {
    const latencyMs = Date.now() - req.startTime;

    // ── emit to dashboard in real time ─────────────────────
    emitTraffic({
      requestId:  req.requestId,
      method:     req.method,
      path:       req.path,
      statusCode: res.statusCode,
      latencyMs,
      ip:         req.ip,
      userId:     req.user?._id || null,
      plan:       req.user?.plan || null,
      timestamp:  new Date().toISOString(),
    });

    // ── persist to MongoDB ──────────────────────────────────
    try {
      await RequestLog.create({
        requestId:  req.requestId,
        ip:         req.ip,
        userId:     req.user?._id   || null,
        apiKeyId:   req.apiKeyId    || null,
        method:     req.method,
        path:       req.path,
        statusCode: res.statusCode,
        latencyMs,
        userAgent:  req.headers['user-agent'],
        bytesIn:    parseInt(req.headers['content-length']) || 0,
        bytesOut:   parseInt(res.getHeader('content-length')) || 0,
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to save request log');
    }
  });

  next();
};

module.exports = requestLogger;