const express  = require('express');
const mongoose = require('mongoose');
const { client: redisClient } = require('../config/redis');
const { success, error }      = require('../utils/response');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1
      ? 'connected' : 'disconnected';

    const redisStatus = redisClient.isReady
      ? 'connected' : 'disconnected';

    const healthy = mongoStatus === 'connected' && redisStatus === 'connected';

    const payload = {
      status:    healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        mongo: mongoStatus,
        redis: redisStatus,
      },
    };

    return healthy
      ? success(res, payload)
      : error(res, 'One or more services degraded', 503, payload);

  } catch (err) {
    return error(res, 'Health check failed', 500);
  }
});

module.exports = router;