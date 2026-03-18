// routes/categories.js — Category CRUD routes
//
// WHY THIS FILE?
// Centralises all category-related HTTP handlers so app.js stays clean.
// All routes are protected by authMiddleware — a user must present a valid
// JWT before any category operation is allowed (Req 10.1).
//
// Database schema reminder:
//   categories(id, name, user_id, created_at)
//   user_id IS NULL  → system default (seeded, visible to everyone, not editable)
//   user_id = <id>   → user-created (only that user can see/edit/delete it)

const express = require('express');

const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require('../middleware/errors');

const router = express.Router();

// Apply authMiddleware to every route in this router.
// This single line protects all four endpoints below — no need to repeat it
// on each handler (Req 10.1, Req 2.3).
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// GET /api/categories
// GET — retrieves category list; safe and idempotent, no state modified
// ---------------------------------------------------------------------------
// WHY GET?
// The client is fetching a representation of the categories collection.
// GET is safe (no side effects) and idempotent (repeated calls return the
// same result), making it the correct verb for read-only retrieval (Req 7.1).
//
// Returns: system defaults (user_id IS NULL) UNION user-created categories
// (user_id = req.user.id), ordered alphabetically by name.
//
// Requirements: 7.1, 10.1, 10.2
router.get('/', async (req, res, next) => {
  // GET — retrieves category list; safe and idempotent, no state modified
  try {
    // Fetch all categories that are either system defaults (user_id IS NULL)
    // or belong to the authenticated user.  Using a single query with OR is
    // more efficient than two separate queries and a JS-level merge.
    const result = await query(
      `SELECT id, name, user_id, created_at
         FROM categories
        WHERE user_id IS NULL
           OR user_id = $1
        ORDER BY name ASC`,
      [req.user.id]
    );

    // HTTP 200 OK — return the array of category objects.
    // An empty array is a valid response when the user has no custom categories
    // and no system defaults exist yet (Req 10.2).
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/categories
// POST — creates a new category resource on the server
// ---------------------------------------------------------------------------
// WHY POST?
// The client is asking the server to create a new subordinate resource (a
// Category).  The resource does not yet exist and its URI is assigned by the
// server after insertion — the canonical reason to use POST over PUT (Req 7.2).
//
// Body: { name: string }
// Returns: 201 Created with the newly inserted category record.
//
// Requirements: 7.2, 10.1
router.post('/', async (req, res, next) => {
  // POST — creates a new category resource on the server
  try {
    const { name } = req.body;

    // Validate that `name` is present and non-empty.
    // Trim whitespace so "  " is treated the same as "" (empty).
    if (!name || !name.trim()) {
      throw new ValidationError('Category name is required.');
    }

    const trimmedName = name.trim();

    // Insert the new category, associating it with the authenticated user.
    // RETURNING * gives us the full row without a second SELECT round-trip.
    // The UNIQUE(name, user_id) constraint in the schema will raise a
    // PostgreSQL error if the user already has a category with this name;
    // the global error handler maps that to a 409 response.
    const result = await query(
      `INSERT INTO categories (name, user_id)
       VALUES ($1, $2)
       RETURNING id, name, user_id, created_at`,
      [trimmedName, req.user.id]
    );

    // HTTP 201 Created — a new resource was successfully created (Req 7.2).
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/categories/:id
// PUT — full replacement of the category resource; client sends complete desired state
// ---------------------------------------------------------------------------
// WHY PUT?
// The client is sending the complete desired state of the category resource
// (just the name, since that is the only mutable field).  PUT signals a full
// replacement rather than a partial patch, making the intent explicit (Req 7.3).
//
// Body: { name: string }
// Returns: 200 OK with the updated category record.
// Returns: 404 if the category does not exist or does not belong to req.user.id
//          (system defaults are not editable — user_id IS NULL check).
//
// Requirements: 7.3, 10.1
router.put('/:id', async (req, res, next) => {
  // PUT — full replacement of the category resource; client sends complete desired state
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate that `name` is present and non-empty.
    if (!name || !name.trim()) {
      throw new ValidationError('Category name is required.');
    }

    const trimmedName = name.trim();

    // Update the category name, but ONLY if:
    //   1. The row exists (id matches).
    //   2. It belongs to the authenticated user (user_id = req.user.id).
    //      This implicitly excludes system defaults (user_id IS NULL) because
    //      NULL != req.user.id in SQL.
    // RETURNING * lets us confirm the update happened and return the new state.
    const result = await query(
      `UPDATE categories
          SET name = $1
        WHERE id = $2
          AND user_id = $3
        RETURNING id, name, user_id, created_at`,
      [trimmedName, id, req.user.id]
    );

    // If no row was returned the category either doesn't exist or isn't owned
    // by this user — both cases map to 404 to avoid leaking existence info.
    if (result.rows.length === 0) {
      throw new NotFoundError('Category not found.');
    }

    // HTTP 200 OK — return the updated category record.
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/categories/:id
// DELETE — removes the resource; 204 No Content signals success with no body
// ---------------------------------------------------------------------------
// WHY DELETE?
// The client is requesting removal of a specific resource identified by :id.
// HTTP 204 No Content is the conventional success response for DELETE —
// the action was performed and there is no content to return (Req 7.4).
//
// Returns: 204 No Content on success.
// Returns: 404 if the category does not exist or does not belong to req.user.id.
// Returns: 409 Conflict if the category is referenced by one or more transactions.
//
// Requirements: 7.4, 7.5, 10.1
router.delete('/:id', async (req, res, next) => {
  // DELETE — removes the resource; 204 No Content signals success with no body
  try {
    const { id } = req.params;

    // Step 1 — Verify the category exists and is owned by the authenticated user.
    // We must check ownership before attempting deletion to avoid leaking
    // whether a system-default or another user's category exists at this id.
    const ownerCheck = await query(
      `SELECT id FROM categories WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (ownerCheck.rows.length === 0) {
      // Category not found or not owned by this user — return 404.
      throw new NotFoundError('Category not found.');
    }

    // Step 2 — Check if any transactions reference this category.
    // Deleting a category that is still in use would orphan those transactions
    // or violate the FK constraint.  We surface this as a 409 Conflict so the
    // client can inform the user and let them reassign transactions first (Req 7.5).
    const usageCheck = await query(
      `SELECT 1 FROM transactions WHERE category_id = $1 LIMIT 1`,
      [id]
    );

    if (usageCheck.rows.length > 0) {
      throw new ConflictError(
        'Category is in use by one or more transactions and cannot be deleted.'
      );
    }

    // Step 3 — Safe to delete.
    await query('DELETE FROM categories WHERE id = $1', [id]);

    // HTTP 204 No Content — deletion succeeded; no body is returned (Req 7.4).
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
