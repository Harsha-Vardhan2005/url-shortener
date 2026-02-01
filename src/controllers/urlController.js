const UrlModel = require('../models/urlModel');
const { validateUrl, validateCustomCode, validateExpirationDays } = require('../utils/validator');
const { sanitizeCustomCode } = require('../utils/shortCodeGenerator');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');

/**
 * URL Controller - Handles URL shortening business logic
 */
class UrlController {
  /**
   * Shorten a URL
   * POST /api/shorten
   * Body: { url, customCode?, expirationDays? }
   */
  static async shortenUrl(req, res, next) {
    try {
      const { url, customCode, expirationDays } = req.body;

      // Validate URL
      const urlValidation = validateUrl(url);
      if (!urlValidation.isValid) {
        throw new AppError(urlValidation.error, 400);
      }

      const originalUrl = urlValidation.sanitizedUrl;

      // COMMENTED OUT: Allow same URL to have multiple short codes (including custom ones)
      // const existingUrl = await UrlModel.findByOriginalUrl(originalUrl);
      // if (existingUrl) {
      //   const shortUrl = `${process.env.BASE_URL}/${existingUrl.short_code}`;
      //   return res.status(200).json({
      //     success: true,
      //     data: {
      //       shortUrl,
      //       shortCode: existingUrl.short_code,
      //       originalUrl: existingUrl.original_url,
      //       createdAt: existingUrl.created_at,
      //       expiresAt: existingUrl.expires_at,
      //       message: 'URL already shortened',
      //     },
      //   });
      // }

      // Handle custom short code
      let shortCode;
      let isCustom = false;

      if (customCode) {
        const customValidation = validateCustomCode(customCode);
        if (!customValidation.isValid) {
          throw new AppError(customValidation.error, 400);
        }

        const sanitized = sanitizeCustomCode(customCode);
        if (!sanitized) {
          throw new AppError('Invalid custom code format', 400);
        }

        // Check if custom code already exists
        const exists = await UrlModel.exists(sanitized);
        if (exists) {
          throw new AppError('Custom short code already taken', 409);
        }

        shortCode = sanitized;
        isCustom = true;
      } else {
        // Generate unique short code
        shortCode = await UrlModel.generateUniqueShortCode();
      }

      // Calculate expiration date
      let expiresAt = null;
      if (expirationDays) {
        const expirationValidation = validateExpirationDays(expirationDays);
        if (!expirationValidation.isValid) {
          throw new AppError(expirationValidation.error, 400);
        }

        if (expirationDays > 0) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + parseInt(expirationDays));
        }
      }

      // Get user IP
      const userIp = req.ip || req.connection.remoteAddress;

      // Create URL in database
      const newUrl = await UrlModel.create({
        originalUrl,
        shortCode,
        expiresAt,
        userIp,
        isCustom,
      });

      // Cache the URL in Redis (TTL: 24 hours)
      await cacheSet(`url:${shortCode}`, originalUrl, 86400);

      // Generate short URL
      const shortUrl = `${process.env.BASE_URL}/${shortCode}`;

      res.status(201).json({
        success: true,
        data: {
          shortUrl,
          shortCode: newUrl.short_code,
          originalUrl: newUrl.original_url,
          createdAt: newUrl.created_at,
          expiresAt: newUrl.expires_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Redirect to original URL
   * GET /:shortCode
   */
  static async redirectUrl(req, res, next) {
    try {
      const { shortCode } = req.params;

      if (!shortCode) {
        throw new AppError('Short code is required', 400);
      }

      // Try to get from Redis cache first
      let originalUrl = await cacheGet(`url:${shortCode}`);

      if (originalUrl) {
        console.log(`Cache HIT for ${shortCode}`);
        
        // Increment click count asynchronously (don't wait)
        UrlModel.incrementClickCount(shortCode).catch(err => 
          console.error('Error incrementing click count:', err)
        );

        return res.redirect(301, originalUrl);
      }

      console.log(`Cache MISS for ${shortCode}`);

      // Get from database
      const urlRecord = await UrlModel.findByShortCode(shortCode);

      if (!urlRecord) {
        throw new AppError('Short URL not found', 404);
      }

      // Check if URL has expired
      if (urlRecord.expires_at && new Date(urlRecord.expires_at) < new Date()) {
        // Delete expired URL
        await cacheDel(`url:${shortCode}`);
        throw new AppError('This short URL has expired', 410);
      }

      // Cache the URL for future requests
      await cacheSet(`url:${shortCode}`, urlRecord.original_url, 86400);

      // Increment click count and update last accessed
      await UrlModel.incrementClickCount(shortCode);

      // Optional: Record detailed analytics
      const userIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const referrer = req.get('Referer') || req.get('Referrer');

      UrlModel.recordAnalytics({
        shortCode,
        userIp,
        userAgent,
        referrer,
      }).catch(err => console.error('Error recording analytics:', err));

      // Redirect to original URL
      res.redirect(301, urlRecord.original_url);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get URL details (optional - for debugging)
   * GET /api/url/:shortCode
   */
  static async getUrlDetails(req, res, next) {
    try {
      const { shortCode } = req.params;

      const urlRecord = await UrlModel.findByShortCode(shortCode);

      if (!urlRecord) {
        throw new AppError('Short URL not found', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          shortCode: urlRecord.short_code,
          originalUrl: urlRecord.original_url,
          clickCount: urlRecord.click_count,
          createdAt: urlRecord.created_at,
          lastAccessed: urlRecord.last_accessed,
          expiresAt: urlRecord.expires_at,
          isCustom: urlRecord.is_custom,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's URL history (optional)
   * GET /api/my-urls
   */
  static async getMyUrls(req, res, next) {
    try {
      const userIp = req.ip || req.connection.remoteAddress;
      const urls = await UrlModel.findByUserIp(userIp, 20);

      const baseUrl = process.env.BASE_URL;
      const formattedUrls = urls.map(url => ({
        shortUrl: `${baseUrl}/${url.short_code}`,
        shortCode: url.short_code,
        originalUrl: url.original_url,
        clickCount: url.click_count,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
      }));

      res.status(200).json({
        success: true,
        count: formattedUrls.length,
        data: formattedUrls,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UrlController;