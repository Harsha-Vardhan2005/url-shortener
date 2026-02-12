const rateLimit = require('express-rate-limit');
const { cacheIncrement, cacheGet } = require('../config/redis');
const { rateLimitHitsTotal } = require('../config/metrics');

const urlShortenLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
  message: {
    success: false,
    error: {
      message: 'Too many URL shortening requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res, next, options) => {
    rateLimitHitsTotal.inc({ endpoint: 'shorten' });
    res.status(429).json(options.message);
  },
});

const redirectLimiter = rateLimit({
  windowMs: 60000,
  max: 100,
  message: {
    success: false,
    error: {
      message: 'Too many redirect requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
  handler: (req, res, next, options) => {
    rateLimitHitsTotal.inc({ endpoint: 'redirect' });
    res.status(429).json(options.message);
  },
});

const redisRateLimiter = (options = {}) => {
  const {
    windowMs = 60000,
    max = 10,
    message = 'Too many requests',
  } = options;

  return async (req, res, next) => {
    try {
      const key = `ratelimit:${req.ip}:${req.path}`;
      const windowInSeconds = Math.floor(windowMs / 1000);

      const count = await cacheIncrement(key, windowInSeconds);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

      if (count > max) {
        rateLimitHitsTotal.inc({ endpoint: req.path });
        return res.status(429).json({
          success: false,
          error: {
            message,
            retryAfter: Math.ceil(windowMs / 1000),
          },
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next();
    }
  };
};

const analyticsLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: {
    success: false,
    error: {
      message: 'Too many analytics requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  urlShortenLimiter,
  redirectLimiter,
  analyticsLimiter,
  redisRateLimiter,
};