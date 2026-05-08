module.exports = {

  PLANS: {
    FREE:       'free',
    PRO:        'pro',
    ENTERPRISE: 'enterprise',
  },

  RATE_LIMIT_ALGORITHMS: {
    TOKEN_BUCKET:   'tokenBucket',
    SLIDING_WINDOW: 'slidingWindow',
    FIXED_WINDOW:   'fixedWindow',
  },

  ABUSE_ACTIONS: {
    THROTTLED: 'throttled',
    BLOCKED:   'blocked',
    ALERTED:   'alerted',
  },

  ABUSE_SIGNALS: {
    RATE_SURGE:      'rateSurge',
    REPEATED_ERRORS: 'repeatedErrors',
    UA_ROTATION:     'userAgentRotation',
    PAYLOAD_ANOMALY: 'payloadAnomaly',
    GEO_ANOMALY:     'geoAnomaly',
    IP_BLOCKLIST:    'ipBlocklist',
  },

  HTTP_STATUS: {
    OK:                200,
    CREATED:           201,
    BAD_REQUEST:       400,
    UNAUTHORIZED:      401,
    FORBIDDEN:         403,
    NOT_FOUND:         404,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_ERROR:    500,
    BAD_GATEWAY:       502,
  },

  REDIS_KEYS: {
    IP_BLOCKLIST:  (ip)    => `blocklist:${ip}`,
    RATE_LIMIT:    (id, w) => `rl:${id}:${w}`,
    API_KEY_CACHE: (hash)  => `apicache:${hash}`,
    ABUSE_SCORE:   (ip)    => `abusescore:${ip}`,
  },

};