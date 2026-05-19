const RequestLog  = require('../models/RequestLog');
const AbuseEvent  = require('../models/AbuseEvent');
const APIKey      = require('../models/APIKey');
const User        = require('../models/User');
const detection   = require('../services/detection');
const { success, error } = require('../utils/response');
const { HTTP_STATUS }    = require('../constants');
const logger             = require('../utils/logger');

// ══════════════════════════════════════════════════════════════
// GET /admin/stats
// ══════════════════════════════════════════════════════════════
const getStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalRequests,
      totalErrors,
      totalAbuse,
      activeKeys,
      totalUsers,
      avgLatency,
    ] = await Promise.all([
      RequestLog.countDocuments({ createdAt: { $gte: since } }),
      RequestLog.countDocuments({ createdAt: { $gte: since }, statusCode: { $gte: 400 } }),
      AbuseEvent.countDocuments({ createdAt: { $gte: since } }),
      APIKey.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      RequestLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, avg: { $avg: '$latencyMs' } } },
      ]),
    ]);

    return success(res, {
      period:       'last 24 hours',
      totalRequests,
      totalErrors,
      errorRate:    totalRequests > 0
        ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%'
        : '0%',
      totalAbuse,
      activeKeys,
      totalUsers,
      avgLatencyMs: avgLatency[0]?.avg?.toFixed(2) || 0,
    });

  } catch (err) {
    logger.error({ err }, 'getStats error');
    return error(res, 'Failed to fetch stats', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// GET /admin/requests
// ══════════════════════════════════════════════════════════════
const getRequests = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const page  = parseInt(req.query.page)  || 1;
    const skip  = (page - 1) * limit;

    const logs = await RequestLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    return success(res, { page, limit, logs });

  } catch (err) {
    logger.error({ err }, 'getRequests error');
    return error(res, 'Failed to fetch request logs', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// GET /admin/abuse
// ══════════════════════════════════════════════════════════════
const getAbuseEvents = async (req, res) => {
  try {
    const limit    = parseInt(req.query.limit) || 50;
    const page     = parseInt(req.query.page)  || 1;
    const resolved = req.query.resolved === 'true';
    const skip     = (page - 1) * limit;

    const events = await AbuseEvent.find({ resolved })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    return success(res, { page, limit, resolved, events });

  } catch (err) {
    logger.error({ err }, 'getAbuseEvents error');
    return error(res, 'Failed to fetch abuse events', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /admin/block
// ══════════════════════════════════════════════════════════════
const blockIP = async (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return error(res, 'IP address is required', HTTP_STATUS.BAD_REQUEST);
    }

    await detection.blockIP(
      ip,
      { score: 100, signals: { manualBlock: 100 } },
      req.user._id
    );

    logger.info({ ip, adminId: req.user._id, reason }, 'IP manually blocked');
    return success(res, { message: `IP ${ip} blocked successfully` });

  } catch (err) {
    logger.error({ err }, 'blockIP error');
    return error(res, 'Failed to block IP', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// POST /admin/unblock
// ══════════════════════════════════════════════════════════════
const unblockIP = async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return error(res, 'IP address is required', HTTP_STATUS.BAD_REQUEST);
    }

    await detection.unblockIP(ip, req.user._id);

    await AbuseEvent.updateMany(
      { ip, resolved: false },
      { resolved: true, resolvedBy: req.user._id, resolvedAt: new Date() }
    );

    logger.info({ ip, adminId: req.user._id }, 'IP unblocked');
    return success(res, { message: `IP ${ip} unblocked successfully` });

  } catch (err) {
    logger.error({ err }, 'unblockIP error');
    return error(res, 'Failed to unblock IP', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// GET /admin/users
// ══════════════════════════════════════════════════════════════
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    return success(res, { users });

  } catch (err) {
    logger.error({ err }, 'getUsers error');
    return error(res, 'Failed to fetch users', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// PATCH /admin/users/:id — update role, plan, or status
// ══════════════════════════════════════════════════════════════
const updateUser = async (req, res) => {
  try {
    const { role, plan, isActive } = req.body;
    const userId = req.params.id;

    if (userId === req.user._id.toString() && role === 'user') {
      return error(res, 'You cannot demote your own admin account', HTTP_STATUS.BAD_REQUEST);
    }

    const updates = {};
    if (role     !== undefined) updates.role     = role;
    if (plan     !== undefined) updates.plan     = plan;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, select: '-password' }
    );

    if (!user) {
      return error(res, 'User not found', HTTP_STATUS.NOT_FOUND);
    }

    logger.info({ targetUserId: userId, updates, adminId: req.user._id }, 'User updated');
    return success(res, { user });

  } catch (err) {
    logger.error({ err }, 'updateUser error');
    return error(res, 'Failed to update user', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// ══════════════════════════════════════════════════════════════
// DELETE /admin/users/:id — delete user
// ══════════════════════════════════════════════════════════════
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user._id.toString()) {
      return error(res, 'You cannot delete your own account', HTTP_STATUS.BAD_REQUEST);
    }

    await User.findByIdAndDelete(userId);
    await APIKey.updateMany({ userId }, { isActive: false });

    logger.info({ targetUserId: userId, adminId: req.user._id }, 'User deleted');
    return success(res, { message: 'User deleted successfully' });

  } catch (err) {
    logger.error({ err }, 'deleteUser error');
    return error(res, 'Failed to delete user', HTTP_STATUS.INTERNAL_ERROR);
  }
};

module.exports = {
  getStats,
  getRequests,
  getAbuseEvents,
  blockIP,
  unblockIP,
  getUsers,
  updateUser,
  deleteUser,
};