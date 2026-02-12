const express = require('express');
const cors = require('cors');
const path = require('path');
const UrlController = require('./controllers/urlController');
const urlRoutes = require('./routes/urlRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { redirectLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');
const { client, httpRequestsTotal, httpRequestDuration } = require('./config/metrics');

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
  const end = httpRequestDuration.startTimer();
  const route = req.path;

  res.on('finish', () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
    end({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });
  });

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

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
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



// 404 handler - must come after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

module.exports = app;
