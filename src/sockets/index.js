const { Server } = require('socket.io');
const env    = require('../config/env');
const logger = require('../utils/logger');

let io;

// ══════════════════════════════════════════════════════════════
// Initialise Socket.IO on the HTTP server
// ══════════════════════════════════════════════════════════════
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:  env.socket.corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Dashboard client connected');

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Dashboard client disconnected');
    });
  });

  logger.info('Socket.IO initialised');
  return io;
};

// ══════════════════════════════════════════════════════════════
// Emit a live traffic event to all connected dashboard clients
// ══════════════════════════════════════════════════════════════
const emitTraffic = (data) => {
  if (!io) return;
  io.emit('traffic', data);
};

// ══════════════════════════════════════════════════════════════
// Emit an abuse detection event
// ══════════════════════════════════════════════════════════════
const emitAbuse = (data) => {
  if (!io) return;
  io.emit('abuse', data);
};

// ══════════════════════════════════════════════════════════════
// Emit a rate limit event
// ══════════════════════════════════════════════════════════════
const emitRateLimit = (data) => {
  if (!io) return;
  io.emit('rateLimit', data);
};

const getIO = () => io;

module.exports = { initSocket, emitTraffic, emitAbuse, emitRateLimit, getIO };