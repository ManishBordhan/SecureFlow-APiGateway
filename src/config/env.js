require('dotenv').config();

const required = (key) => {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  return process.env[key];
};

module.exports = {

  app: {
    env:  process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    name: process.env.APP_NAME  || 'api-gateway',
  },

  mongo: {
    uri: required('MONGO_URI'),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },

  jwt: {
    secret:    required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  apiKey: {
    cacheTtl: parseInt(process.env.API_KEY_CACHE_TTL_SECONDS) || 60,
  },

  rateLimit: {
    windowMs:  parseInt(process.env.DEFAULT_RATE_LIMIT_WINDOW_MS) || 60000,
    max:       parseInt(process.env.DEFAULT_RATE_LIMIT_MAX) || 100,
    algorithm: process.env.RATE_LIMIT_ALGORITHM || 'tokenBucket',
  },

  abuse: {
    scoreThreshold:  parseInt(process.env.ABUSE_SCORE_THRESHOLD)  || 70,
    blockTtlSeconds: parseInt(process.env.ABUSE_BLOCK_TTL_SECONDS) || 3600,
  },

  upstream: {
    baseUrl: process.env.UPSTREAM_BASE_URL || 'https://jsonplaceholder.typicode.com',
    routes:  process.env.UPSTREAM_ROUTES
               ? JSON.parse(process.env.UPSTREAM_ROUTES)
               : null,
  },

  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || 'http://localhost:5173',
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  ml: {
      serviceUrl: process.env.ML_SERVICE_URL || 'http://localhost:5001',
      enabled:    process.env.ML_SERVICE_URL !== undefined,
  },	
};