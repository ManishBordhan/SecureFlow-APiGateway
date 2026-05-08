const express  = require('express');
const path     = require('path');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');
const logger   = require('./utils/logger');
const { error } = require('./utils/response');

const healthRoutes = require('./routes/health');
const authRoutes   = require('./routes/auth');
const adminRoutes  = require('./routes/admin');
const proxyRoutes  = require('./routes/proxy');

const app = express();

// ── Security ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "cdn.socket.io"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc:    ["'self'", "ws://localhost:3000", "http://localhost:3000"],
      styleSrc:      ["'self'", "'unsafe-inline'"],
      imgSrc:        ["'self'", "data:"],
    },
  },
}));
app.use(cors({
  origin:      '*',
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));

// ── Body parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP logging ───────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// ── Routes ─────────────────────────────────────────────────────
app.use('/health',    healthRoutes);
app.use('/auth',      authRoutes);
app.use('/admin',     adminRoutes);
app.use('/dashboard', express.static(path.join(__dirname, '..', 'dashboard')));
app.use('/proxy',     proxyRoutes);  // all upstream requests go through /proxy/*

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => {
  error(res, `Cannot ${req.method} ${req.path}`, 404);
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled exception');
  error(res, 'Internal server error', 500);
});

module.exports = app;