const { createClient } = require('redis');
const env    = require('./env');
const logger = require('../utils/logger');

const client = createClient({
  socket: {
    host: env.redis.host,
    port: env.redis.port,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max reconnect attempts reached');
        return new Error('Redis unavailable');
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

client.on('connect',      ()    => logger.info('Redis connected'));
client.on('error',        (err) => logger.error({ err }, 'Redis error'));
client.on('reconnecting', ()    => logger.warn('Redis reconnecting...'));

const connectRedis = async () => {
  await client.connect();
};

module.exports = { client, connectRedis };