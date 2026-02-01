const UrlModel = require('../models/urlModel');
const { AppError } = require('../middleware/errorHandler');

/**
 * Analytics Controller - Handles URL analytics and statistics
 */
class AnalyticsController {
  /**
   * Get analytics for a specific short code
   * GET /api/analytics/:shortCode
   */
  static async getAnalytics(req, res, next) {
    try {
      const { shortCode } = req.params;

      if (!shortCode) {
        throw new AppError('Short code is required', 400);
      }

      // Get basic analytics from urls table
      const analytics = await UrlModel.getAnalytics(shortCode);

      if (!analytics) {
        throw new AppError('Short URL not found', 404);
      }

      // Calculate days since creation
      const createdDate = new Date(analytics.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

      // Calculate average clicks per day
      const avgClicksPerDay = daysSinceCreation > 0 
        ? (analytics.click_count / daysSinceCreation).toFixed(2) 
        : analytics.click_count;

      // Check if expired
      const isExpired = analytics.expires_at && new Date(analytics.expires_at) < now;

      // Calculate days until expiration
      let daysUntilExpiration = null;
      if (analytics.expires_at && !isExpired) {
        const expirationDate = new Date(analytics.expires_at);
        daysUntilExpiration = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));
      }

      res.status(200).json({
        success: true,
        data: {
          shortCode: analytics.short_code,
          originalUrl: analytics.original_url,
          statistics: {
            totalClicks: analytics.click_count,
            avgClicksPerDay: parseFloat(avgClicksPerDay),
            daysSinceCreation,
            daysUntilExpiration,
          },
          dates: {
            createdAt: analytics.created_at,
            lastAccessed: analytics.last_accessed,
            expiresAt: analytics.expires_at,
          },
          status: {
            isExpired,
            isCustom: analytics.is_custom,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed analytics (from url_analytics table)
   * GET /api/analytics/:shortCode/detailed
   */
  static async getDetailedAnalytics(req, res, next) {
    try {
      const { shortCode } = req.params;
      const limit = parseInt(req.query.limit) || 100;

      if (!shortCode) {
        throw new AppError('Short code is required', 400);
      }

      // Check if URL exists
      const urlRecord = await UrlModel.findByShortCode(shortCode);
      if (!urlRecord) {
        throw new AppError('Short URL not found', 404);
      }

      // Get detailed analytics
      const detailedAnalytics = await UrlModel.getDetailedAnalytics(shortCode, limit);

      // Aggregate analytics by date
      const clicksByDate = {};
      detailedAnalytics.forEach(record => {
        const date = new Date(record.accessed_at).toISOString().split('T')[0];
        clicksByDate[date] = (clicksByDate[date] || 0) + 1;
      });

      // Aggregate by referrer
      const clicksByReferrer = {};
      detailedAnalytics.forEach(record => {
        const referrer = record.referrer || 'Direct';
        clicksByReferrer[referrer] = (clicksByReferrer[referrer] || 0) + 1;
      });

      res.status(200).json({
        success: true,
        data: {
          shortCode,
          totalRecords: detailedAnalytics.length,
          clicksByDate,
          clicksByReferrer,
          recentClicks: detailedAnalytics.slice(0, 20).map(record => ({
            accessedAt: record.accessed_at,
            userIp: record.user_ip,
            referrer: record.referrer || 'Direct',
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top URLs by clicks
   * GET /api/analytics/top
   */
  static async getTopUrls(req, res, next) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const { query } = require('../config/database');

      const sql = `
        SELECT 
          short_code,
          original_url,
          click_count,
          created_at,
          is_custom
        FROM urls
        WHERE expires_at IS NULL OR expires_at > NOW()
        ORDER BY click_count DESC
        LIMIT $1;
      `;

      const result = await query(sql, [limit]);

      const baseUrl = process.env.BASE_URL;
      const topUrls = result.rows.map((url, index) => ({
        rank: index + 1,
        shortUrl: `${baseUrl}/${url.short_code}`,
        shortCode: url.short_code,
        originalUrl: url.original_url,
        clicks: url.click_count,
        createdAt: url.created_at,
        isCustom: url.is_custom,
      }));

      res.status(200).json({
        success: true,
        count: topUrls.length,
        data: topUrls,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get system statistics
   * GET /api/analytics/stats
   */
  static async getSystemStats(req, res, next) {
    try {
      const { query } = require('../config/database');

      // Total URLs created
      const totalUrlsResult = await query('SELECT COUNT(*) as total FROM urls');
      const totalUrls = parseInt(totalUrlsResult.rows[0].total);

      // Total clicks
      const totalClicksResult = await query('SELECT SUM(click_count) as total FROM urls');
      const totalClicks = parseInt(totalClicksResult.rows[0].total) || 0;

      // Active URLs (not expired)
      const activeUrlsResult = await query(`
        SELECT COUNT(*) as total FROM urls 
        WHERE expires_at IS NULL OR expires_at > NOW()
      `);
      const activeUrls = parseInt(activeUrlsResult.rows[0].total);

      // Custom URLs count
      const customUrlsResult = await query('SELECT COUNT(*) as total FROM urls WHERE is_custom = true');
      const customUrls = parseInt(customUrlsResult.rows[0].total);

      // URLs created today
      const todayUrlsResult = await query(`
        SELECT COUNT(*) as total FROM urls 
        WHERE created_at >= CURRENT_DATE
      `);
      const urlsCreatedToday = parseInt(todayUrlsResult.rows[0].total);

      // Average clicks per URL
      const avgClicksPerUrl = totalUrls > 0 ? (totalClicks / totalUrls).toFixed(2) : 0;

      res.status(200).json({
        success: true,
        data: {
          totalUrls,
          activeUrls,
          expiredUrls: totalUrls - activeUrls,
          totalClicks,
          avgClicksPerUrl: parseFloat(avgClicksPerUrl),
          customUrls,
          urlsCreatedToday,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController;