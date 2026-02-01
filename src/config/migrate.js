const { pool } = require('./database');
require('dotenv').config();

const createTables = async () => {
  try {
    console.log('🚀 Starting database migration...');

    // Create urls table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id SERIAL PRIMARY KEY,
        original_url VARCHAR(2048) NOT NULL,
        short_code VARCHAR(10) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        click_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP,
        user_ip VARCHAR(45),
        is_custom BOOLEAN DEFAULT FALSE
      );
    `);

    console.log('✅ Table "urls" created successfully');

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_short_code ON urls(short_code);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_created_at ON urls(created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_expires_at ON urls(expires_at);
    `);

    console.log('✅ Indexes created successfully');

    // Create analytics table (optional - for detailed tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS url_analytics (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(10) NOT NULL,
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_ip VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        FOREIGN KEY (short_code) REFERENCES urls(short_code) ON DELETE CASCADE
      );
    `);

    console.log('✅ Table "url_analytics" created successfully');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_short_code ON url_analytics(short_code);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_accessed_at ON url_analytics(accessed_at DESC);
    `);

    console.log('✅ Analytics indexes created successfully');
    console.log('🎉 Database migration completed!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration
createTables();