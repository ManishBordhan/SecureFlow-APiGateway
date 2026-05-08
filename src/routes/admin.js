const express = require('express');
const {
  getStats,
  getRequests,
  getAbuseEvents,
  blockIP,
  unblockIP,
  getUsers,
} = require('../controllers/admin');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// all admin routes require JWT + admin role
router.use(authenticate);
router.use(requireAdmin);

router.get('/stats',    getStats);
router.get('/requests', getRequests);
router.get('/abuse',    getAbuseEvents);
router.get('/users',    getUsers);
router.post('/block',   blockIP);
router.post('/unblock', unblockIP);

module.exports = router;