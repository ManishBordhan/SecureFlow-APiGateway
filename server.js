const http                    = require('http');
const app                     = require('./src/app');
const connectDB               = require('./src/config/db');
const { connectRedis }        = require('./src/config/redis');
const { initSocket }          = require('./src/sockets');
const { startJobs }           = require('./src/jobs/cleanupJobs');
const env                     = require('./src/config/env');
const logger                  = require('./src/utils/logger');

const server = http.createServer(app);
initSocket(server);

const start = async () => {
  try {
    await connectDB();
    await connectRedis();

    startJobs();

    server.listen(env.app.port, () => {
      logger.info(
        `[${env.app.name}] running on port ${env.app.port} — ${env.app.env}`
      );
    });
  } catch (err) {
    logger.error({ err }, 'Server failed to start');
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start();