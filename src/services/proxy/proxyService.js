const http    = require('http');
const https   = require('https');
const { URL } = require('url');

const env    = require('../../config/env');
const logger = require('../../utils/logger');
const { HTTP_STATUS } = require('../../constants');

// ══════════════════════════════════════════════════════════════
// Resolve target URL from route config or base URL
// ══════════════════════════════════════════════════════════════
const resolveTarget = (reqPath) => {
  // if per-route config exists, match prefix first
  if (env.upstream.routes && env.upstream.routes.length > 0) {
    const matched = env.upstream.routes.find((route) =>
      reqPath.startsWith(route.prefix)
    );
    if (matched) return matched.target;
  }

  // fall back to base URL
  return env.upstream.baseUrl;
};

// ══════════════════════════════════════════════════════════════
// Strip internal headers before forwarding
// ══════════════════════════════════════════════════════════════
const sanitizeHeaders = (headers) => {
  const cleaned = { ...headers };
  delete cleaned['host'];
  delete cleaned['x-api-key'];
  delete cleaned['authorization'];
  return cleaned;
};

// ══════════════════════════════════════════════════════════════
// Core proxy function
// ══════════════════════════════════════════════════════════════
const forwardRequest = (req, res) => {
  return new Promise((resolve, reject) => {
    const target    = resolveTarget(req.path);
    const targetUrl = new URL(req.path, target);

    // preserve query string
    targetUrl.search = new URL(
      req.url,
      'http://localhost'
    ).search;

    const isHttps   = targetUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const options = {
      hostname: targetUrl.hostname,
      port:     targetUrl.port || (isHttps ? 443 : 80),
      path:     targetUrl.pathname + targetUrl.search,
      method:   req.method,
      headers:  {
        ...sanitizeHeaders(req.headers),
        'x-forwarded-for':   req.ip,
        'x-forwarded-host':  req.hostname,
        'x-gateway-request': 'true',
      },
    };

    logger.debug({
      method:  req.method,
      target:  targetUrl.href,
    }, 'Forwarding request');

    const startTime = Date.now();

    const proxyReq = transport.request(options, (proxyRes) => {
      const latencyMs = Date.now() - startTime;

      // ── forward status and headers back to client ──────
      res.status(proxyRes.statusCode);

      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        // skip headers that cause issues when forwarded
        if (!['transfer-encoding', 'connection'].includes(key)) {
          res.setHeader(key, value);
        }
      });

      // ── add gateway metadata headers ───────────────────
      res.setHeader('x-gateway-latency', `${latencyMs}ms`);
      res.setHeader('x-served-by', env.app.name);

      // ── pipe response body back to client ──────────────
      let responseBody = '';
      proxyRes.on('data', (chunk) => { responseBody += chunk; });
      proxyRes.on('end',  () => {
        res.end(responseBody);
        resolve({
          statusCode: proxyRes.statusCode,
          latencyMs,
          bytesIn:  parseInt(req.headers['content-length']) || 0,
          bytesOut: Buffer.byteLength(responseBody),
        });
      });
    });

    // ── handle upstream errors ─────────────────────────────
    proxyReq.on('error', (err) => {
      logger.error({ err, path: req.path }, 'Upstream request failed');
      reject(err);
    });

    // ── set timeout ────────────────────────────────────────
    proxyReq.setTimeout(10000, () => {
      proxyReq.destroy();
      reject(new Error('Upstream request timed out'));
    });

    // ── forward request body if present ───────────────────
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = JSON.stringify(req.body);
      proxyReq.setHeader('content-type',   'application/json');
      proxyReq.setHeader('content-length', Buffer.byteLength(bodyStr));
      proxyReq.write(bodyStr);
    }

    proxyReq.end();
  });
};

module.exports = { forwardRequest, resolveTarget };