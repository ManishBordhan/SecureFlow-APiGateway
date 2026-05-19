const express = require('express');
const {
  getStats, getRequests, getAbuseEvents,
  blockIP, unblockIP, getUsers,
} = require('../controllers/admin');
const {
  getSettings, updateSettings, resetSettings,
} = require('../controllers/settings');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

// existing routes
router.get('/stats',          getStats);
router.get('/requests',       getRequests);
router.get('/abuse',          getAbuseEvents);
router.get('/users',          getUsers);
router.post('/block',         blockIP);
router.post('/unblock',       unblockIP);

// settings routes
router.get('/settings',       getSettings);
router.post('/settings',      updateSettings);
router.post('/settings/reset',resetSettings);

module.exports = router;