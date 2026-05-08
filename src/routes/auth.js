const express = require('express');
const {
  register,
  login,
  generateAPIKey,
  listAPIKeys,
  revokeAPIKey,
} = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── Public routes ──────────────────────────────────────────────
router.post('/register', register);
router.post('/login',    login);

// ── Protected routes (JWT required) ───────────────────────────
router.post('/keys',        authenticate, generateAPIKey);
router.get('/keys',         authenticate, listAPIKeys);
router.delete('/keys/:id',  authenticate, revokeAPIKey);

module.exports = router;