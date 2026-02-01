const { query } = require('../config/database');
const { generate } = require('../utils/shortCodeGenerator');

/**
 * URL Model - Handles all database operations for URLs
 */
class UrlModel {
  /**
   * Create a new short URL
   * @param {Object} urlData - { originalUrl, shortCode, expiresAt, userIp, isCustom }
   * @returns {Object} - Created URL record
   */
  static async create(urlData) {
    const { originalUrl, shortCode, expiresAt, userIp, isCustom } = urlData;

    const sql = `
      INSERT INTO urls (original_url, short_code, expires_at, user_ip, is_custom)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [originalUrl, shortCode, expiresAt, userIp, isCustom || false];
    const result = await query(sql, values);

    return result.rows[0];
  }

  /**
   * Find URL by short code
   * @param {string} shortCode - Short code to find
   * @returns {Object|null} - URL record or null
   */
  static async findByShortCode(shortCode) {
    const sql = `
      SELECT * FROM urls 
      WHERE short_code = $1;
    `;

    const result = await query(sql, [shortCode]);
    return result.rows[0] || null;
  }

  /**
   * Find URL by original URL
   * @param {string} originalUrl - Original URL to find
   * @returns {Object|null} - URL record or null
   */
  static async findByOriginalUrl(originalUrl) {
    const sql = `
      SELECT * FROM urls 
      WHERE original_url = $1 
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const result = await query(sql, [originalUrl]);
    return result.rows[0] || null;
  }

  /**
   * Check if short code exists
   * @param {string} shortCode - Short code to check
   * @returns {boolean} - True if exists
   */
  static async exists(shortCode) {
    const sql = `
      SELECT EXISTS(SELECT 1 FROM urls WHERE short_code = $1);
    `;

    const result = await query(sql, [shortCode]);
    return result.rows[0].exists;
  }

  /**
   * Update click count and last accessed time
   * @param {string} shortCode - Short code to update
   * @returns {Object} - Updated URL record
   */
  static async incrementClickCount(shortCode) {
    const sql = `
      UPDATE urls 
      SET click_count = click_count + 1,
          last_accessed = NOW()
      WHERE short_code = $1
      RETURNING *;
    `;

    const result = await query(sql, [shortCode]);
    return result.rows[0];
  }

  /**
   * Get analytics for a short code
   * @param {string} shortCode - Short code
   * @returns {Object} - Analytics data
   */
  static async getAnalytics(shortCode) {
    const sql = `
      SELECT 
        short_code,
        original_url,
        click_count,
        created_at,
        last_accessed,
        expires_at,
        is_custom
      FROM urls 
      WHERE short_code = $1;
    `;

    const result = await query(sql, [shortCode]);
    return result.rows[0] || null;
  }

  /**
   * Delete expired URLs (cleanup job)
   * @returns {number} - Number of deleted records
   */
  static async deleteExpired() {
    const sql = `
      DELETE FROM urls 
      WHERE expires_at IS NOT NULL 
      AND expires_at < NOW();
    `;

    const result = await query(sql);
    return result.rowCount;
  }

  /**
   * Get all URLs created by an IP (optional - for user history)
   * @param {string} userIp - User IP address
   * @param {number} limit - Max records to return
   * @returns {Array} - Array of URL records
   */
  static async findByUserIp(userIp, limit = 10) {
    const sql = `
      SELECT 
        short_code,
        original_url,
        click_count,
        created_at,
        expires_at
      FROM urls 
      WHERE user_ip = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const result = await query(sql, [userIp, limit]);
    return result.rows;
  }

  /**
   * Generate a unique short code (handles collisions)
   * @param {number} maxAttempts - Maximum retry attempts
   * @returns {string} - Unique short code
   */
  static async generateUniqueShortCode(maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
      const shortCode = generate();
      const exists = await this.exists(shortCode);

      if (!exists) {
        return shortCode;
      }

      console.log(`Collision detected for ${shortCode}, retrying...`);
    }

    throw new Error('Failed to generate unique short code after multiple attempts');
  }

  /**
   * Record detailed analytics (optional - for url_analytics table)
   * @param {Object} analyticsData - { shortCode, userIp, userAgent, referrer }
   */
  static async recordAnalytics(analyticsData) {
    const { shortCode, userIp, userAgent, referrer } = analyticsData;

    const sql = `
      INSERT INTO url_analytics (short_code, user_ip, user_agent, referrer)
      VALUES ($1, $2, $3, $4);
    `;

    await query(sql, [shortCode, userIp, userAgent, referrer]);
  }

  /**
   * Get detailed analytics from url_analytics table
   * @param {string} shortCode - Short code
   * @param {number} limit - Max records
   * @returns {Array} - Analytics records
   */
  static async getDetailedAnalytics(shortCode, limit = 100) {
    const sql = `
      SELECT 
        accessed_at,
        user_ip,
        user_agent,
        referrer
      FROM url_analytics
      WHERE short_code = $1
      ORDER BY accessed_at DESC
      LIMIT $2;
    `;

    const result = await query(sql, [shortCode, limit]);
    return result.rows;
  }
}

module.exports = UrlModel;