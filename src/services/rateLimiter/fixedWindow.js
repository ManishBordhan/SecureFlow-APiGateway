const { client: defaultRedis } = require('../../config/redis');
const logger = require('../../utils/logger');

const SCRIPT = `
local key       = KEYS[1]
local max       = tonumber(ARGV[1])
local windowSec = tonumber(ARGV[2])
local count     = tonumber(redis.call('GET', key))
if count == nil then
  redis.call('SET',    key, 1)
  redis.call('EXPIRE', key, windowSec)
  return { 1, max - 1, max }
elseif count < max then
  redis.call('INCR', key)
  return { 1, max - count - 1, max }
else
  return { 0, 0, max }
end
`;

const consume = async (identifier, options = {}, redisClient = null) => {
  const {
    windowMs = 60000,
    max      = 100,
  } = options;

  const redis     = redisClient || defaultRedis;
  const windowSec = Math.ceil(windowMs / 1000);
  const bucket    = Math.floor(Date.now() / windowMs);
  const key       = `rl:fw:${identifier}:${bucket}`;

  try {
    const result = await redis.eval(SCRIPT, {
      keys:      [key],
      arguments: [String(max), String(windowSec)],
    });

    return {
      allowed:    Number(result[0]) === 1,
      tokensLeft: Number(result[1]),
      capacity:   Number(result[2]),
      algorithm:  'fixedWindow',
    };

  } catch (err) {
    logger.error({ err, identifier }, 'Fixed window Redis error');
    return { allowed: true, tokensLeft: -1, capacity: max, algorithm: 'fixedWindow' };
  }
};

module.exports = { consume };