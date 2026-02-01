const express = require('express');
const router = express.Router();
const UrlController = require('../controllers/urlController');
const { urlShortenLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/shorten
 * @desc    Shorten a URL
 * @access  Public
 * @body    { url: string, customCode?: string, expirationDays?: number }
 */
router.post('/shorten', urlShortenLimiter, asyncHandler(UrlController.shortenUrl));

/**
 * @route   GET /api/url/:shortCode
 * @desc    Get URL details without redirecting
 * @access  Public
 */
router.get('/url/:shortCode', asyncHandler(UrlController.getUrlDetails));

/**
 * @route   GET /api/my-urls
 * @desc    Get all URLs created by current user (based on IP)
 * @access  Public
 */
router.get('/my-urls', asyncHandler(UrlController.getMyUrls));

module.exports = router;