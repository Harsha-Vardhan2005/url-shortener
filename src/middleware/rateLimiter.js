const rateLimit = require('express-rate-limit');
const { cacheIncrement, cacheGet } = require('../config/redis');

/**
 * Rate limiter for URL shortening endpoint
 * Prevents abuse by limiting requests per IP
 */
const urlShortenLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // 10 requests per minute
  message: {
    success: false,
    error: {
      message: 'Too many URL shortening requests. Please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Custom key generator based on IP
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
});

/**
 * Rate limiter for redirect endpoint (less strict)
 * Allow more requests for URL redirects
 */
const redirectLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
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
  // Skip successful requests from counting
  skipSuccessfulRequests: false,
  skipFailedRequests: true,
});

/**
 * Custom Redis-based rate limiter (alternative to express-rate-limit)
 * More scalable for distributed systems
 */
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

      // Increment counter in Redis
      const count = await cacheIncrement(key, windowInSeconds);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', Date.now() + windowMs);

      // Check if limit exceeded
      if (count > max) {
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
      // If Redis fails, allow the request (fail open)
      console.error('Rate limiter error:', error);
      next();
    }
  };
};

/**
 * Rate limiter for analytics endpoint
 */
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