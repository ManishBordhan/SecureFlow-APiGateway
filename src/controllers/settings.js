const { getConfig, updateConfig, resetConfig } = require('../services/configService');
const { success, error } = require('../utils/response');
const { HTTP_STATUS }    = require('../constants');
const logger             = require('../utils/logger');

// GET /admin/settings
const getSettings = async (req, res) => {
  try {
    const config = await getConfig();
    return success(res, { config });
  } catch (err) {
    logger.error({ err }, 'getSettings error');
    return error(res, 'Failed to fetch settings', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// POST /admin/settings
const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return error(res, 'No settings provided', HTTP_STATUS.BAD_REQUEST);
    }
    const config = await updateConfig(updates);
    logger.info({ adminId: req.user._id, updates }, 'Settings updated by admin');
    return success(res, { config, message: 'Settings updated successfully' });
  } catch (err) {
    logger.error({ err }, 'updateSettings error');
    return error(res, 'Failed to update settings', HTTP_STATUS.INTERNAL_ERROR);
  }
};

// POST /admin/settings/reset
const resetSettings = async (req, res) => {
  try {
    const config = await resetConfig();
    logger.info({ adminId: req.user._id }, 'Settings reset to defaults');
    return success(res, { config, message: 'Settings reset to defaults' });
  } catch (err) {
    logger.error({ err }, 'resetSettings error');
    return error(res, 'Failed to reset settings', HTTP_STATUS.INTERNAL_ERROR);
  }
};

module.exports = { getSettings, updateSettings, resetSettings };