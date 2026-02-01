require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/database');
const { createRedisClient } = require('./config/redis');

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
const startServer = async () => {
  try {
    console.log('🚀 Starting URL Shortener Server...');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Test PostgreSQL connection
    console.log('📊 Connecting to PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');

    // Connect to Redis (optional - won't crash if Redis is unavailable)
    console.log('🔴 Connecting to Redis...');
    const redisClient = await createRedisClient();
    if (redisClient) {
      console.log('✅ Redis connected successfully');
    } else {
      console.log('⚠️  Redis unavailable - running without cache');
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
      console.log(`📝 API Endpoints:`);
      console.log(`   - POST ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/shorten`);
      console.log(`   - GET  ${process.env.BASE_URL || `http://localhost:${PORT}`}/:shortCode`);
      console.log(`   - GET  ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/analytics/:shortCode`);
      console.log('\n✨ URL Shortener is ready!\n');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        console.log('🔴 HTTP server closed');

        // Close database connections
        try {
          await pool.end();
          console.log('🔴 PostgreSQL connection closed');

          const { getRedisClient } = require('./config/redis');
          const redisClient = getRedisClient();
          if (redisClient) {
            await redisClient.quit();
            console.log('🔴 Redis connection closed');
          }

          console.log('✅ Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      // Don't exit in production, just log
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      // Exit on uncaught exceptions
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();