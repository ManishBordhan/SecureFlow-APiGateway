const env    = require('../../config/env');
const logger = require('../../utils/logger');

const MODEL_ENDPOINTS = {
  isolationForest: '/score',
  lof:             '/score/lof',
  oneClassSvm:     '/score/svm',
};

const getMLScore = async (ip, modelName = 'isolationForest') => {
  try {
    const endpoint = MODEL_ENDPOINTS[modelName] || '/score';
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${env.ml.serviceUrl}${endpoint}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ip }),
      signal:  controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();

    logger.debug({ ip, mlScore: data.score, mlAnomaly: data.anomaly, model: modelName }, 'ML score');

    return {
      score:   data.score,
      anomaly: data.anomaly,
      action:  data.action,
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      logger.warn({ ip }, 'ML service timeout');
    } else {
      logger.warn({ err, ip }, 'ML service unavailable');
    }
    return null;
  }
};

module.exports = { getMLScore };