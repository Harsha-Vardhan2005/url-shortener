const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { analyticsLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/analytics/:shortCode
 * @desc    Get analytics for a specific short code
 * @access  Public
 */
router.get('/:shortCode', analyticsLimiter, asyncHandler(AnalyticsController.getAnalytics));

/**
 * @route   GET /api/analytics/:shortCode/detailed
 * @desc    Get detailed analytics (click history, referrers, etc.)
 * @access  Public
 */
router.get('/:shortCode/detailed', analyticsLimiter, asyncHandler(AnalyticsController.getDetailedAnalytics));

/**
 * @route   GET /api/analytics/top
 * @desc    Get top URLs by click count
 * @access  Public
 */
router.get('/top/urls', analyticsLimiter, asyncHandler(AnalyticsController.getTopUrls));

/**
 * @route   GET /api/analytics/stats
 * @desc    Get system-wide statistics
 * @access  Public
 */
router.get('/system/stats', analyticsLimiter, asyncHandler(AnalyticsController.getSystemStats));

module.exports = router;