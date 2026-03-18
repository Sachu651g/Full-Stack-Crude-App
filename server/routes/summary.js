// routes/summary.js — Financial summary and report routes
//
// WHY THIS FILE?
// Centralises all aggregation and reporting endpoints so app.js stays clean.
// All routes are protected by authMiddleware — a user must present a valid
// JWT before any summary or report data is returned (Req 10.1).
//
// Database schema reminder:
//   transactions(id, user_id, category_id, type, amount, date, description, created_at, updated_at)
//   categories(id, name, ...)
//   type   -- 'income' | 'expense'
//   amount -- NUMERIC(12,2), must be > 0
//   date   -- DATE (ISO 8601)

const express = require('express');
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authMiddleware to every route in this router.
// One line protects all three endpoints -- no need to repeat it per handler (Req 10.1).
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/summary
// GET — read-only aggregation; no state is modified
// ---------------------------------------------------------------------------
// WHY GET?
// This endpoint computes a financial summary derived from existing transaction
// data. No resource is created, updated, or deleted -- the server state is
// unchanged after the request. GET is the correct verb for safe, idempotent
// read-only operations (Req 8.1).
//
// Query params (all optional):
//   startDate -- include transactions on or after this date (ISO 8601)
//   endDate   -- include transactions on or before this date (ISO 8601)
//
// Returns: { totalIncome: number, totalExpenses: number, netBalance: number }
//
// Requirements: 8.1, 8.2, 10.1
router.get('/summary', async (req, res, next) => {
  // GET — read-only aggregation; no state is modified
  try {
    // Always scope to the authenticated user so data is private (Req 8.1).
    var conditions = ['user_id = $1'];
    var params = [req.user.id];

    // Helper: push a value into params and return its $N placeholder string.
    // String concatenation is used so the dollar sign is a literal SQL character,
    // not a JS template expression -- avoids template literal syntax issues.
    function addParam(value) {
      params.push(value);
      return '$' + params.length;
    }

    // Optional date range filter (Req 8.2).
    if (req.query.startDate) {
      conditions.push('date >= ' + addParam(req.query.startDate) + '::date');
    }

    if (req.query.endDate) {
      conditions.push('date <= ' + addParam(req.query.endDate) + '::date');
    }

    var whereClause = conditions.join(' AND ');

    // Compute total income and total expenses in a single query using
    // conditional aggregation -- avoids two separate round-trips to the DB.
    // COALESCE ensures we return 0 rather than NULL when no rows match.
    var result = await query(
      'SELECT ' +
      'COALESCE(SUM(CASE WHEN type = \'income\'  THEN amount ELSE 0 END), 0) AS "totalIncome", ' +
      'COALESCE(SUM(CASE WHEN type = \'expense\' THEN amount ELSE 0 END), 0) AS "totalExpenses" ' +
      'FROM transactions ' +
      'WHERE ' + whereClause,
      params
    );

    var totalIncome   = parseFloat(result.rows[0].totalIncome);
    var totalExpenses = parseFloat(result.rows[0].totalExpenses);
    var netBalance    = totalIncome - totalExpenses;

    // HTTP 200 OK -- return the three summary metrics (Req 8.1).
    res.json({
      totalIncome:   totalIncome,
      totalExpenses: totalExpenses,
      netBalance:    netBalance,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/by-category
// GET — retrieves computed report data; safe and idempotent
// ---------------------------------------------------------------------------
// WHY GET?
// The client is requesting a read-only aggregation of transaction totals
// grouped by category. No server state is modified; the same request always
// returns the same result for the same data set. GET is safe and idempotent,
// making it the correct choice for this reporting endpoint (Req 9.1).
//
// Query params (all optional):
//   startDate -- include transactions on or after this date (ISO 8601)
//   endDate   -- include transactions on or before this date (ISO 8601)
//
// Returns: [{ categoryId, categoryName, total }]
//
// Requirements: 9.1, 10.1
router.get('/reports/by-category', async (req, res, next) => {
  // GET — retrieves computed report data; safe and idempotent
  try {
    // Always scope to the authenticated user so data is private (Req 9.1).
    var conditions = ['t.user_id = $1'];
    var params = [req.user.id];

    // Helper: push a value into params and return its $N placeholder string.
    // String concatenation is used so the dollar sign is a literal SQL character,
    // not a JS template expression -- avoids template literal syntax issues.
    function addParam(value) {
      params.push(value);
      return '$' + params.length;
    }

    // Optional date range filter.
    if (req.query.startDate) {
      conditions.push('t.date >= ' + addParam(req.query.startDate) + '::date');
    }

    if (req.query.endDate) {
      conditions.push('t.date <= ' + addParam(req.query.endDate) + '::date');
    }

    var whereClause = conditions.join(' AND ');

    // JOIN with categories to get the human-readable name alongside the id.
    // GROUP BY category so we get one row per category with the summed total.
    // ORDER BY total DESC puts the highest-spending categories first, which is
    // the most useful default ordering for a pie/donut chart (Req 9.1).
    var result = await query(
      'SELECT c.id AS "categoryId", c.name AS "categoryName", ' +
      'COALESCE(SUM(t.amount), 0) AS total ' +
      'FROM transactions t ' +
      'JOIN categories c ON c.id = t.category_id ' +
      'WHERE ' + whereClause + ' ' +
      'GROUP BY c.id, c.name ' +
      'ORDER BY total DESC',
      params
    );

    // Map rows to ensure numeric total (pg returns NUMERIC as string).
    var rows = result.rows.map(function(row) {
      return {
        categoryId:   row.categoryId,
        categoryName: row.categoryName,
        total:        parseFloat(row.total),
      };
    });

    // HTTP 200 OK -- return the category totals array (Req 9.1).
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/reports/by-month
// GET — retrieves computed report data; safe and idempotent
// ---------------------------------------------------------------------------
// WHY GET?
// The client is requesting a read-only aggregation of income and expenses
// grouped by calendar month. No server state is modified; repeated calls with
// the same parameters return the same result. GET is safe and idempotent,
// making it the correct choice for this time-series reporting endpoint (Req 9.2).
//
// Query params (all optional):
//   startDate -- include transactions on or after this date (ISO 8601)
//   endDate   -- include transactions on or before this date (ISO 8601)
//
// Returns: [{ month: 'YYYY-MM', totalIncome: number, totalExpenses: number }]
//
// Requirements: 9.2, 10.1
router.get('/reports/by-month', async (req, res, next) => {
  // GET — retrieves computed report data; safe and idempotent
  try {
    // Always scope to the authenticated user so data is private (Req 9.2).
    var conditions = ['user_id = $1'];
    var params = [req.user.id];

    // Helper: push a value into params and return its $N placeholder string.
    // String concatenation is used so the dollar sign is a literal SQL character,
    // not a JS template expression -- avoids template literal syntax issues.
    function addParam(value) {
      params.push(value);
      return '$' + params.length;
    }

    // Optional date range filter.
    if (req.query.startDate) {
      conditions.push('date >= ' + addParam(req.query.startDate) + '::date');
    }

    if (req.query.endDate) {
      conditions.push('date <= ' + addParam(req.query.endDate) + '::date');
    }

    var whereClause = conditions.join(' AND ');

    // TO_CHAR(date, 'YYYY-MM') truncates each transaction date to its calendar
    // month, allowing GROUP BY to aggregate all transactions in the same month.
    // Conditional aggregation (CASE WHEN type = ...) computes income and
    // expenses in a single pass without needing a subquery or self-join.
    // ORDER BY month ASC gives chronological order, ideal for a line/bar chart.
    var result = await query(
      'SELECT TO_CHAR(date, \'YYYY-MM\') AS month, ' +
      'COALESCE(SUM(CASE WHEN type = \'income\'  THEN amount ELSE 0 END), 0) AS "totalIncome", ' +
      'COALESCE(SUM(CASE WHEN type = \'expense\' THEN amount ELSE 0 END), 0) AS "totalExpenses" ' +
      'FROM transactions ' +
      'WHERE ' + whereClause + ' ' +
      'GROUP BY TO_CHAR(date, \'YYYY-MM\') ' +
      'ORDER BY month ASC',
      params
    );

    // Map rows to ensure numeric totals (pg returns NUMERIC as string).
    var rows = result.rows.map(function(row) {
      return {
        month:         row.month,
        totalIncome:   parseFloat(row.totalIncome),
        totalExpenses: parseFloat(row.totalExpenses),
      };
    });

    // HTTP 200 OK -- return the monthly breakdown array (Req 9.2).
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
