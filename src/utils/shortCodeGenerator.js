const { customAlphabet } = require('nanoid');

// Base62 characters: a-z, A-Z, 0-9 (62 characters total)
const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Create nanoid generator with Base62 alphabet
const generateShortCode = customAlphabet(BASE62_ALPHABET, 7);

/**
 * Generate a unique short code for URL
 * @param {number} length - Length of the short code (default: 7)
 * @returns {string} - Generated short code
 * 
 * Why 7 characters?
 * - 62^7 = 3,521,614,606,208 possible combinations (3.5 trillion)
 * - Even at 1000 URLs/second, would take 111+ years to exhaust
 * - Collision probability is extremely low
 */
const generate = (length = 7) => {
  if (length) {
    const customGenerator = customAlphabet(BASE62_ALPHABET, length);
    return customGenerator();
  }
  return generateShortCode();
};

/**
 * Validate short code format
 * @param {string} shortCode - Short code to validate
 * @returns {boolean} - True if valid
 */
const isValidShortCode = (shortCode) => {
  if (!shortCode || typeof shortCode !== 'string') {
    return false;
  }

  // Check length (between 4 and 10 characters)
  if (shortCode.length < 4 || shortCode.length > 10) {
    return false;
  }

  // Check if contains only Base62 characters
  const validPattern = /^[0-9A-Za-z]+$/;
  return validPattern.test(shortCode);
};

/**
 * Sanitize custom short code from user input
 * @param {string} customCode - User-provided short code
 * @returns {string|null} - Sanitized code or null if invalid
 */
const sanitizeCustomCode = (customCode) => {
  if (!customCode || typeof customCode !== 'string') {
    return null;
  }

  // Remove whitespace and convert to alphanumeric only
  const sanitized = customCode.trim().replace(/[^0-9A-Za-z]/g, '');

  // Check if valid after sanitization
  if (isValidShortCode(sanitized)) {
    return sanitized;
  }

  return null;
};

/**
 * Generate multiple unique short codes at once
 * @param {number} count - Number of codes to generate
 * @param {number} length - Length of each code
 * @returns {string[]} - Array of unique short codes
 */
const generateBatch = (count = 10, length = 7) => {
  const codes = new Set();
  const generator = customAlphabet(BASE62_ALPHABET, length);

  while (codes.size < count) {
    codes.add(generator());
  }

  return Array.from(codes);
};

module.exports = {
  generate,
  isValidShortCode,
  sanitizeCustomCode,
  generateBatch,
};