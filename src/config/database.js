const { Pool } = require("pg");
require("dotenv").config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,  // Change this - Internal URL doesn't need SSL
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,  // Increase this
});

// Test database connection
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
  process.exit(1);
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", {
      text,
      duration,
      rows: res.rowCount,
    });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

// 🔥 NEW: Initialize DB schema (runs once on startup)
const initDB = async () => {
  try {
    await query(`
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

    console.log("✅ Database initialized (urls table ready)");
  } catch (error) {
    console.error("❌ Database initialization failed", error);
    process.exit(1);
  }
};

// Run initialization immediately
initDB();

// Get a client from the pool
const getClient = () => {
  return pool.connect();
};

module.exports = {
  query,
  getClient,
  pool,
};
