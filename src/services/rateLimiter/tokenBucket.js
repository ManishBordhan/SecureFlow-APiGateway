const { client: defaultRedis } = require('../../config/redis');
const logger = require('../../utils/logger');

const SCRIPT = `
local key        = KEYS[1]
local capacity   = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now        = tonumber(ARGV[3])
local tsKey      = key .. ':ts'
local tokens     = tonumber(redis.call('GET', key))
local lastRefill = tonumber(redis.call('GET', tsKey))
if tokens == nil then
  tokens      = capacity
  lastRefill  = now
end
local elapsed = math.max(0, now - lastRefill)
local refill  = math.floor(elapsed * refillRate)
tokens        = math.min(capacity, tokens + refill)
if tokens >= 1 then
  redis.call('SET',    key,   tokens - 1)
  redis.call('SET',    tsKey, now)
  redis.call('EXPIRE', key,   3600)
  redis.call('EXPIRE', tsKey, 3600)
  return { 1, tokens - 1, capacity }
else
  redis.call('SET',    tsKey, now)
  redis.call('EXPIRE', tsKey, 3600)
  return { 0, 0, capacity }
end
`;

const consume = async (identifier, options = {}, redisClient = null) => {
  const {
    capacity   = 100,
    refillRate = 1,
  } = options;

  const redis = redisClient || defaultRedis;
  const key   = `rl:tb:${identifier}`;
  const now   = Date.now() / 1000;

  try {
    const result = await redis.eval(SCRIPT, {
      keys:      [key],
      arguments: [String(capacity), String(refillRate), String(now)],
    });

    return {
      allowed:    Number(result[0]) === 1,
      tokensLeft: Number(result[1]),
      capacity:   Number(result[2]),
      algorithm:  'tokenBucket',
    };

  } catch (err) {
    logger.error({ err, identifier }, 'Token bucket Redis error');
    return { allowed: true, tokensLeft: -1, capacity, algorithm: 'tokenBucket' };
  }
};

module.exports = { consume };