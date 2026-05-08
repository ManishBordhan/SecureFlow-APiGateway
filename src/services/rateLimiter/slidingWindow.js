const { client: defaultRedis } = require('../../config/redis');
const logger = require('../../utils/logger');

const SCRIPT = `
local key       = KEYS[1]
local now       = tonumber(ARGV[1])
local windowMs  = tonumber(ARGV[2])
local max       = tonumber(ARGV[3])
local windowSec = windowMs / 1000
local cutoff    = now - windowSec
redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = tonumber(redis.call('ZCARD', key))
if count < max then
  local member = tostring(now) .. tostring(math.random(1000000))
  redis.call('ZADD',   key, now, member)
  redis.call('EXPIRE', key, math.ceil(windowSec) + 1)
  return { 1, max - count - 1, max }
else
  redis.call('EXPIRE', key, math.ceil(windowSec) + 1)
  return { 0, 0, max }
end
`;

const consume = async (identifier, options = {}, redisClient = null) => {
  const {
    windowMs = 60000,
    max      = 100,
  } = options;

  const redis = redisClient || defaultRedis;
  const key   = `rl:sw:${identifier}`;
  const now   = Date.now() / 1000;

  try {
    const result = await redis.eval(SCRIPT, {
      keys:      [key],
      arguments: [String(now), String(windowMs), String(max)],
    });

    return {
      allowed:    Number(result[0]) === 1,
      tokensLeft: Number(result[1]),
      capacity:   Number(result[2]),
      algorithm:  'slidingWindow',
    };

  } catch (err) {
    logger.error({ err, identifier }, 'Sliding window Redis error');
    return { allowed: true, tokensLeft: -1, capacity: max, algorithm: 'slidingWindow' };
  }
};

module.exports = { consume };