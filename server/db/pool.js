// db/pool.js — PostgreSQL connection pool singleton
//
// WHY A POOL?
// Opening a new database connection for every HTTP request is expensive (TCP
// handshake, auth, etc.).  A connection pool keeps a set of connections open
// and reuses them across requests, dramatically improving throughput.
//
// WHY A SINGLETON?
// Node.js caches `require()` results, so the first call to
// `require('./db/pool')` creates the Pool; every subsequent call returns the
// same instance.  This guarantees the whole server shares one pool rather than
// accidentally creating many pools that each hold their own connections.

const { Pool } = require('pg');
const { DatabaseError } = require('../middleware/errors');

// ---------------------------------------------------------------------------
// Pool configuration
// ---------------------------------------------------------------------------
// `connectionString` is read from the DATABASE_URL environment variable which
// is set in the .env file (see .env.example).  pg's Pool accepts a full
// connection URI like:
//   postgres://user:password@host:5432/dbname
//
// Additional pool options (all optional — pg has sensible defaults):
//   max          – maximum number of clients in the pool (default 10)
//   idleTimeoutMillis – how long a client can sit idle before being closed
//   connectionTimeoutMillis – how long to wait for a connection before error
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---------------------------------------------------------------------------
// Pool-level error handler
// ---------------------------------------------------------------------------
// The 'error' event fires when an idle client encounters an unexpected error
// (e.g., the database server restarted).  Without this listener Node.js would
// throw an unhandled exception and crash the process.
//
// We log the error here; the per-request error handling (see errorHandler.js)
// will catch query-time errors and return HTTP 503 to the client (Req 11.5).
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
  // Do NOT call process.exit() — the pool will attempt to recover by creating
  // a new client the next time one is needed.
});

// ---------------------------------------------------------------------------
// query helper
// ---------------------------------------------------------------------------
// Wraps pool.query() so callers don't need to import the pool directly.
// Usage:
//   const { query } = require('./db/pool');
//   const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
//
// Parameters:
//   text   – parameterised SQL string (use $1, $2, … placeholders)
//   params – array of values to bind to the placeholders (prevents SQL injection)
//
// Returns a pg QueryResult object with a `.rows` array.
//
// Error handling (Req 11.5):
// If the database is unreachable or returns an infrastructure-level error,
// this helper re-throws it as a DatabaseError.  The centralized errorHandler
// maps DatabaseError → HTTP 503 Service Unavailable, so route handlers don't
// need to handle connection failures individually.
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    // Re-throw as DatabaseError so errorHandler returns HTTP 503 (Req 11.5).
    // We preserve the original message for server-side logging while keeping
    // the client-facing message generic (set in the DatabaseError default).
    console.error('Database query error:', err.message);
    throw new DatabaseError('Service temporarily unavailable');
  }
};

module.exports = { pool, query };
