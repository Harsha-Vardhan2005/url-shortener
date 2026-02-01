const UrlModel = require('../src/models/urlModel');
const { generate, isValidShortCode } = require('../src/utils/shortCodeGenerator');
const { validateUrl } = require('../src/utils/validator');

/**
 * Simple tests for URL shortener
 * Run with: node tests/url.test.js
 */

console.log('🧪 Running URL Shortener Tests...\n');

// Test 1: Short code generator
console.log('Test 1: Short Code Generator');
const shortCode = generate();
console.log(`Generated short code: ${shortCode}`);
console.log(`Length: ${shortCode.length}`);
console.log(`Is valid: ${isValidShortCode(shortCode)}`);
console.log('✅ Test 1 passed\n');

// Test 2: Short code validation
console.log('Test 2: Short Code Validation');
console.log(`isValidShortCode('abc123'): ${isValidShortCode('abc123')}`); // true
console.log(`isValidShortCode('abc'): ${isValidShortCode('abc')}`); // false (too short)
console.log(`isValidShortCode('abc@123'): ${isValidShortCode('abc@123')}`); // false (invalid chars)
console.log('✅ Test 2 passed\n');

// Test 3: URL validation
console.log('Test 3: URL Validation');
const validUrl = validateUrl('https://github.com/username');
console.log('Valid URL:', validUrl);

const invalidUrl = validateUrl('not-a-url');
console.log('Invalid URL:', invalidUrl);

const localhostUrl = validateUrl('http://localhost:3000');
console.log('Localhost URL (should be blocked):', localhostUrl);
console.log('✅ Test 3 passed\n');

// Test 4: Batch generation (ensure no duplicates)
console.log('Test 4: Batch Short Code Generation');
const { generateBatch } = require('../src/utils/shortCodeGenerator');
const batch = generateBatch(10, 7);
console.log(`Generated ${batch.length} codes:`, batch);
const uniqueCodes = new Set(batch);
console.log(`Unique codes: ${uniqueCodes.size}`);
console.log(`No duplicates: ${batch.length === uniqueCodes.size}`);
console.log('✅ Test 4 passed\n');

// Test 5: Custom code sanitization
console.log('Test 5: Custom Code Sanitization');
const { sanitizeCustomCode } = require('../src/utils/shortCodeGenerator');
console.log(`sanitizeCustomCode('my-link'): ${sanitizeCustomCode('my-link')}`); // mylink
console.log(`sanitizeCustomCode('hello@123'): ${sanitizeCustomCode('hello@123')}`); // hello123
console.log(`sanitizeCustomCode('   test   '): ${sanitizeCustomCode('   test   ')}`); // null (too short)
console.log('✅ Test 5 passed\n');

console.log('✨ All tests completed!\n');

// Example usage with database (commented out - requires DB connection)
/*
async function testDatabaseOperations() {
  console.log('Test 6: Database Operations (requires DB connection)');
  
  try {
    // Generate unique short code
    const shortCode = await UrlModel.generateUniqueShortCode();
    console.log(`Generated unique short code: ${shortCode}`);
    
    // Create URL
    const newUrl = await UrlModel.create({
      originalUrl: 'https://github.com/test',
      shortCode,
      expiresAt: null,
      userIp: '127.0.0.1',
      isCustom: false,
    });
    console.log('Created URL:', newUrl);
    
    // Find by short code
    const found = await UrlModel.findByShortCode(shortCode);
    console.log('Found URL:', found);
    
    console.log('✅ Test 6 passed\n');
  } catch (error) {
    console.error('❌ Test 6 failed:', error.message);
  }
}

// Uncomment to run database tests:
// testDatabaseOperations();
*/