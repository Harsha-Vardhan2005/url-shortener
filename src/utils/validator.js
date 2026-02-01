const validator = require('validator');

/**
 * Validate and sanitize URL input
 * @param {string} url - URL to validate
 * @returns {Object} - { isValid: boolean, sanitizedUrl: string, error: string }
 */
const validateUrl = (url) => {
  // Check if URL is provided
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      sanitizedUrl: null,
      error: 'URL is required',
    };
  }

  // Trim whitespace
  const trimmedUrl = url.trim();

  // Check if empty after trim
  if (trimmedUrl.length === 0) {
    return {
      isValid: false,
      sanitizedUrl: null,
      error: 'URL cannot be empty',
    };
  }

  // Check URL length (PostgreSQL VARCHAR limit)
  if (trimmedUrl.length > 2048) {
    return {
      isValid: false,
      sanitizedUrl: null,
      error: 'URL is too long (max 2048 characters)',
    };
  }

  // Validate URL format using validator library
  const isValid = validator.isURL(trimmedUrl, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: true,
  });

  if (!isValid) {
    return {
      isValid: false,
      sanitizedUrl: null,
      error: 'Invalid URL format. URL must start with http:// or https://',
    };
  }

  // Additional security checks
  try {
    const urlObj = new URL(trimmedUrl);

    // Block localhost and private IPs (security measure)
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0'];
    const hostname = urlObj.hostname.toLowerCase();

    if (blockedHosts.includes(hostname) || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      return {
        isValid: false,
        sanitizedUrl: null,
        error: 'Cannot shorten localhost or private IP addresses',
      };
    }

    return {
      isValid: true,
      sanitizedUrl: trimmedUrl,
      error: null,
    };
  } catch (error) {
    return {
      isValid: false,
      sanitizedUrl: null,
      error: 'Invalid URL format',
    };
  }
};

/**
 * Validate custom short code from user
 * @param {string} customCode - Custom short code
 * @returns {Object} - { isValid: boolean, error: string }
 */
const validateCustomCode = (customCode) => {
  if (!customCode || typeof customCode !== 'string') {
    return {
      isValid: false,
      error: 'Custom code is required',
    };
  }

  const trimmed = customCode.trim();

  // Check length
  if (trimmed.length < 4) {
    return {
      isValid: false,
      error: 'Custom code must be at least 4 characters',
    };
  }

  if (trimmed.length > 10) {
    return {
      isValid: false,
      error: 'Custom code must be at most 10 characters',
    };
  }

  // Check if alphanumeric only
  const validPattern = /^[0-9A-Za-z]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: 'Custom code can only contain letters and numbers',
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

/**
 * Validate expiration days
 * @param {number} days - Number of days
 * @returns {Object} - { isValid: boolean, error: string }
 */
const validateExpirationDays = (days) => {
  if (days === undefined || days === null) {
    return { isValid: true, error: null }; // Optional field
  }

  const numDays = Number(days);

  if (isNaN(numDays)) {
    return {
      isValid: false,
      error: 'Expiration days must be a number',
    };
  }

  if (numDays < 0) {
    return {
      isValid: false,
      error: 'Expiration days cannot be negative',
    };
  }

  if (numDays > 3650) {
    // Max 10 years
    return {
      isValid: false,
      error: 'Expiration days cannot exceed 3650 (10 years)',
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

module.exports = {
  validateUrl,
  validateCustomCode,
  validateExpirationDays,
};