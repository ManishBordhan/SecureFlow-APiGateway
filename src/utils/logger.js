const pino = require('pino');
const env  = require('../config/env');

const logger = pino({
  level: env.log.level,
  transport: env.app.env === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  base:      { service: env.app.name },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;