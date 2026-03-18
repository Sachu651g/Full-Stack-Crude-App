// app.js — Express application factory
// Configures middleware, mounts all API routes, and attaches the global error handler.
// Kept separate from server.js so the app can be imported in tests without binding a port.

const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Enable Cross-Origin Resource Sharing.
// In production, CORS_ORIGIN env var should be set to the Vercel frontend URL
// e.g. https://nexusfinance.vercel.app
// In development it falls back to allowing all origins.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? {
  origin: corsOrigin,
  credentials: true,
} : {}));

// ---------------------------------------------------------------------------
// Route mounts — each router is added in later tasks; placeholders are here
// so the app starts cleanly even before those files exist.
// ---------------------------------------------------------------------------

// Health-check endpoint — useful for verifying the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth routes — handles /api/auth/register and /api/auth/login (Task 3)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Category routes — handles /api/categories CRUD (Task 4)
const categoryRoutes = require('./routes/categories');
app.use('/api/categories', categoryRoutes);

// Transaction routes — handles /api/transactions CRUD (Task 5)
const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);

// Summary and report routes — handles /api/summary, /api/reports/by-category, /api/reports/by-month (Task 6)
const summaryRoutes = require('./routes/summary');
app.use('/api', summaryRoutes);

// Jack AI chat route — proxies to Gemini
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// ---------------------------------------------------------------------------
// Global error handler — must be registered AFTER all routes
// Returns consistent JSON { message } with appropriate HTTP status (Req 10.3)
// Delegates to errorHandler which maps typed errors to status codes.
// ---------------------------------------------------------------------------
app.use(errorHandler);

module.exports = app;
