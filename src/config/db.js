const mongoose = require('mongoose');
const env      = require('./env');
const logger   = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(env.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info('MongoDB connected');

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect');
      isConnected = false;
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB error');
    });

  } catch (err) {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  }
};

module.exports = connectDB;