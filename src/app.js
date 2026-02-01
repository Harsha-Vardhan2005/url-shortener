const express = require('express');
const cors = require('cors');
const path = require('path');
const UrlController = require('./controllers/urlController');
const urlRoutes = require('./routes/urlRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { redirectLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');

// Create Express app
const app = express();

// Trust proxy (important for rate limiting by IP on AWS/Render)
app.set('trust proxy', 1);

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware (simple version)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', urlRoutes);
app.use('/api/analytics', analyticsRoutes);

// Redirect route - Main feature (GET /:shortCode)
// This MUST come after /api routes to avoid conflicts
app.get('/:shortCode', redirectLimiter, asyncHandler(UrlController.redirectUrl));

// Root endpoint - Welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'URL Shortener API',
    version: '1.0.0',
    endpoints: {
      shorten: 'POST /api/shorten',
      redirect: 'GET /:shortCode',
      analytics: 'GET /api/analytics/:shortCode',
      myUrls: 'GET /api/my-urls',
      health: 'GET /health',
    },
    documentation: 'See README.md for full API documentation',
  });
});

app.post('/__admin/reset-db', async (req, res) => {
  try {
    const { query } = require('./config/database');

    await query(`DROP TABLE IF EXISTS urls;`);
    await query(`
      CREATE TABLE urls (
        id SERIAL PRIMARY KEY,
        original_url VARCHAR(2048) NOT NULL,
        short_code VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        click_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP,
        user_ip VARCHAR(45),
        is_custom BOOLEAN DEFAULT FALSE
      );
    `);

    res.json({ success: true, message: 'DB reset complete' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB reset failed' });
  }
});


// 404 handler - must come after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

module.exports = app;
