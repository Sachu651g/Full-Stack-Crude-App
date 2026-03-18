// routes/transactions.js — Transaction CRUD routes with filtering and pagination
//
// WHY THIS FILE?
// Centralises all transaction-related HTTP handlers so app.js stays clean.
// All routes are protected by authMiddleware — a user must present a valid
// JWT before any transaction operation is allowed (Req 10.1).
//
// Database schema reminder:
//   transactions(id, user_id, category_id, type, amount, date, description, created_at, updated_at)
//   type    -- 'income' | 'expense'
//   amount  -- NUMERIC(12,2), must be > 0
//   date    -- DATE (ISO 8601)
//   user_id -- FK to users(id); every transaction is owned by exactly one user

const express = require('express');
const { query } = require('../db/pool');
const authMiddleware = require('../middleware/authMiddleware');
const { ValidationError, NotFoundError } = require('../middleware/errors');

const router = express.Router();

// Apply authMiddleware to every route in this router.
// One line protects all six endpoints -- no need to repeat it per handler (Req 10.1).
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// Shared validation helper
// ---------------------------------------------------------------------------
// Validates the four core transaction fields.
// Returns an array of { field, message } objects; empty array means valid.
// Used by both POST (full validation) and PUT (full validation) handlers.
// PATCH calls this only for the subset of fields present in the request body.
function validateTransactionFields(fields, requireAll) {
  var amount = fields.amount;
  var type = fields.type;
  var category_id = fields.category_id;
  var date = fields.date;
  var errors = [];

  // amount -- must be a positive finite number
  if (requireAll || amount !== undefined) {
    var num = Number(amount);
    if (amount === undefined || amount === null || amount === '') {
      errors.push({ field: 'amount', message: 'amount is required.' });
    } else if (!Number.isFinite(num) || num <= 0) {
      errors.push({ field: 'amount', message: 'amount must be a positive number.' });
    }
  }

  // type -- must be exactly 'income' or 'expense'
  if (requireAll || type !== undefined) {
    if (!type) {
      errors.push({ field: 'type', message: 'type is required.' });
    } else if (type !== 'income' && type !== 'expense') {
      errors.push({ field: 'type', message: "type must be 'income' or 'expense'." });
    }
  }

  // category_id -- must be present and a positive integer
  if (requireAll || category_id !== undefined) {
    var catId = Number(category_id);
    if (category_id === undefined || category_id === null || category_id === '') {
      errors.push({ field: 'category_id', message: 'category_id is required.' });
    } else if (!Number.isInteger(catId) || catId <= 0) {
      errors.push({ field: 'category_id', message: 'category_id must be a positive integer.' });
    }
  }

  // date -- must be a valid ISO 8601 date string (YYYY-MM-DD or full ISO timestamp)
  if (requireAll || date !== undefined) {
    if (!date) {
      errors.push({ field: 'date', message: 'date is required.' });
    } else {
      var parsed = Date.parse(date);
      if (isNaN(parsed)) {
        errors.push({ field: 'date', message: 'date must be a valid ISO 8601 date.' });
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// POST /api/transactions
// POST -- creates a new transaction resource; URI assigned by server
// ---------------------------------------------------------------------------
// WHY POST?
// The client is asking the server to create a new subordinate resource.
// The resource does not yet exist and its URI (id) is assigned by the server
// after insertion -- the canonical reason to use POST (Req 3.1).
//
// Body: { amount, type, category_id, date, description? }
// Returns: 201 Created with the newly inserted transaction record.
//
// Requirements: 3.1, 3.2, 3.3, 3.4, 10.1
router.post('/', async (req, res, next) => {
  // POST -- creates a new transaction resource; URI assigned by server
  try {
    var amount = req.body.amount;
    var type = req.body.type;
    var category_id = req.body.category_id;
    var date = req.body.date;
    var description = req.body.description;

    // Validate all required fields before touching the database.
    // Collecting all errors at once gives the client a complete picture (Req 3.2, 3.3).
    var errors = validateTransactionFields(
      { amount: amount, type: type, category_id: category_id, date: date },
      true
    );
    if (errors.length > 0) {
      throw new ValidationError('Validation failed.', errors);
    }

    // Insert the transaction, associating it with the authenticated user (Req 3.4).
    // RETURNING avoids a second SELECT round-trip and returns the full record.
    var result = await query(
      'INSERT INTO transactions (user_id, category_id, type, amount, date, description) ' +
      'VALUES ($1, $2, $3, $4, $5, $6) ' +
      'RETURNING id, user_id, category_id, type, amount, date, description, created_at, updated_at',
      [req.user.id, category_id, type, amount, date, description || null]
    );

    // HTTP 201 Created -- a new resource was successfully created (Req 3.1).
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/transactions
// GET -- retrieves transactions; safe and idempotent, no server state modified
// ---------------------------------------------------------------------------
// WHY GET?
// The client is fetching a representation of the transactions collection.
// GET is safe (no side effects) and idempotent (repeated calls return the
// same result), making it the correct verb for read-only retrieval (Req 4.1).
//
// Query params (all optional):
//   type        -- filter by 'income' or 'expense'
//   category_id -- filter by category
//   startDate   -- include transactions on or after this date (ISO 8601)
//   endDate     -- include transactions on or before this date (ISO 8601)
//   page        -- page number, default 1
//   limit       -- records per page, default 20
//
// Returns: { data: [...], pagination: { page, limit, total, totalPages } }
//
// Requirements: 4.1, 4.4, 10.1
router.get('/', async (req, res, next) => {
  // GET -- retrieves transactions; safe and idempotent, no server state modified
  try {
    // Parse pagination params with safe defaults.
    var page   = Math.max(1, parseInt(req.query.page,  10) || 1);
    var limit  = Math.max(1, parseInt(req.query.limit, 10) || 20);
    var offset = (page - 1) * limit;

    // Build the WHERE clause dynamically based on which filters were supplied.
    // Using parameterised placeholders prevents SQL injection.
    // We always filter by user_id so users only see their own transactions (Req 4.1).
    var conditions = ['t.user_id = $1'];
    var params = [req.user.id];

    // Helper: push a value into params and return its $N placeholder string.
    // String concatenation is used so the dollar sign is a literal SQL character,
    // not a JS template expression -- avoids template literal syntax issues.
    function addParam(value) {
      params.push(value);
      return '$' + params.length;
    }

    if (req.query.type) {
      if (req.query.type !== 'income' && req.query.type !== 'expense') {
        throw new ValidationError("type filter must be 'income' or 'expense'.");
      }
      conditions.push('t.type = ' + addParam(req.query.type));
    }

    if (req.query.category_id) {
      conditions.push('t.category_id = ' + addParam(req.query.category_id));
    }

    if (req.query.startDate) {
      // Cast to DATE so the comparison works correctly regardless of time zone.
      conditions.push('t.date >= ' + addParam(req.query.startDate) + '::date');
    }

    if (req.query.endDate) {
      conditions.push('t.date <= ' + addParam(req.query.endDate) + '::date');
    }

    var whereClause = conditions.join(' AND ');

    // Count total matching rows for pagination metadata.
    // Pass a copy of params because addParam will mutate the array for LIMIT/OFFSET.
    var countResult = await query(
      'SELECT COUNT(*) AS total FROM transactions t WHERE ' + whereClause,
      params.slice()
    );
    var total      = parseInt(countResult.rows[0].total, 10);
    var totalPages = Math.ceil(total / limit);

    // Append LIMIT and OFFSET as bound parameters to keep the query fully parameterised.
    var limitPlaceholder  = addParam(limit);
    var offsetPlaceholder = addParam(offset);

    // Fetch the paginated, ordered result set.
    // ORDER BY date DESC, id DESC gives a stable, deterministic order (Req 4.4).
    var dataResult = await query(
      'SELECT t.id, t.user_id, t.category_id, t.type, t.amount, t.date, ' +
      't.description, t.created_at, t.updated_at ' +
      'FROM transactions t ' +
      'WHERE ' + whereClause + ' ' +
      'ORDER BY t.date DESC, t.id DESC ' +
      'LIMIT ' + limitPlaceholder + ' OFFSET ' + offsetPlaceholder,
      params
    );

    // Return data alongside pagination metadata so the client can render
    // page controls without a separate request (Req 4.4).
    res.json({
      data: dataResult.rows,
      pagination: { page: page, limit: limit, total: total, totalPages: totalPages },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/transactions/:id
// GET -- retrieves a single resource by ID; safe and idempotent
// ---------------------------------------------------------------------------
// WHY GET?
// Fetching a single known resource by its identifier is the textbook use of
// GET with a resource URI. Safe and idempotent -- no state is modified.
//
// Returns: 200 with the transaction object.
// Returns: 404 if the transaction does not exist or is not owned by req.user.id.
//          We return 404 in both cases to avoid leaking whether a transaction
//          exists at all (ownership privacy, Req 4.3).
//
// Requirements: 4.2, 4.3, 10.1
router.get('/:id', async (req, res, next) => {
  // GET -- retrieves a single resource by ID; safe and idempotent
  try {
    var id = req.params.id;

    // Fetch the transaction only if it belongs to the authenticated user.
    // The AND user_id = $2 clause enforces ownership (Req 4.3).
    var result = await query(
      'SELECT id, user_id, category_id, type, amount, date, description, created_at, updated_at ' +
      'FROM transactions ' +
      'WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      // Not found or not owned -- both cases return 404 (Req 4.3).
      throw new NotFoundError('Transaction not found.');
    }

    // HTTP 200 OK -- return the single transaction record (Req 4.2).
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/transactions/:id
// PUT -- full replacement; client sends the complete desired state of the resource
// ---------------------------------------------------------------------------
// WHY PUT?
// The client is sending the complete desired state of the transaction resource.
// PUT signals a full replacement -- every mutable field must be provided and
// the server replaces the stored record entirely (Req 5.1).
//
// Body: { amount, type, category_id, date, description? }
// Returns: 200 with the updated transaction record.
// Returns: 404 if the transaction does not exist or is not owned by req.user.id.
// Returns: 400 if any required field is missing or invalid.
//
// Requirements: 5.1, 5.3, 5.4, 10.1
router.put('/:id', async (req, res, next) => {
  // PUT -- full replacement; client sends the complete desired state of the resource
  try {
    var id = req.params.id;
    var amount = req.body.amount;
    var type = req.body.type;
    var category_id = req.body.category_id;
    var date = req.body.date;
    var description = req.body.description;

    // Full validation -- all four required fields must be present and valid (Req 5.1).
    var errors = validateTransactionFields(
      { amount: amount, type: type, category_id: category_id, date: date },
      true
    );
    if (errors.length > 0) {
      throw new ValidationError('Validation failed.', errors);
    }

    // Update the transaction, but ONLY if it belongs to the authenticated user.
    // updated_at is refreshed to NOW() to track when the record last changed.
    // RETURNING lets us confirm the update happened and return the new state.
    var result = await query(
      'UPDATE transactions ' +
      'SET amount = $1, type = $2, category_id = $3, date = $4, description = $5, updated_at = NOW() ' +
      'WHERE id = $6 AND user_id = $7 ' +
      'RETURNING id, user_id, category_id, type, amount, date, description, created_at, updated_at',
      [amount, type, category_id, date, description || null, id, req.user.id]
    );

    // No row returned means the transaction does not exist or is not owned by
    // this user -- both cases map to 404 (Req 5.3, 5.4).
    if (result.rows.length === 0) {
      throw new NotFoundError('Transaction not found.');
    }

    // HTTP 200 OK -- return the fully updated transaction record (Req 5.1).
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/transactions/:id
// PATCH -- partial update; only provided fields are modified, others remain unchanged
// ---------------------------------------------------------------------------
// WHY PATCH?
// The client wants to update only a subset of the transaction fields.
// Unlike PUT (which requires the complete resource state), PATCH applies a
// partial modification -- only the fields present in the request body are
// changed; all other fields keep their current values (Req 5.2).
//
// Body: any subset of { amount, type, category_id, date, description }
// Returns: 200 with the updated transaction record.
// Returns: 404 if the transaction does not exist or is not owned by req.user.id.
// Returns: 400 if any provided field fails validation.
//
// Requirements: 5.2, 5.3, 5.4, 10.1
router.patch('/:id', async (req, res, next) => {
  // PATCH -- partial update; only provided fields are modified, others remain unchanged
  try {
    var id = req.params.id;

    // The set of fields the client is allowed to patch.
    var PATCHABLE = ['amount', 'type', 'category_id', 'date', 'description'];

    // Collect only the fields that are actually present in the request body.
    // This is the core of PATCH semantics -- we never overwrite fields the
    // client did not mention.
    var updates = {};
    for (var i = 0; i < PATCHABLE.length; i++) {
      var field = PATCHABLE[i];
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // If the client sent no recognised fields, there is nothing to do.
    // Return 400 rather than silently performing a no-op UPDATE.
    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields provided for update.');
    }

    // Validate only the fields that were provided (requireAll = false).
    // This lets the client patch just the amount without re-sending type, etc.
    var errors = validateTransactionFields(updates, false);
    if (errors.length > 0) {
      throw new ValidationError('Validation failed.', errors);
    }

    // Build the SET clause dynamically from only the fields present in updates.
    // Param layout: [...fieldValues, id, user_id]
    //
    // Example -- PATCH body { amount: 50, date: '2024-01-15' }:
    //   params     = [50, '2024-01-15', <id>, <user_id>]
    //   SET clause = "amount = $1, date = $2, updated_at = NOW()"
    //   WHERE      = "id = $3 AND user_id = $4"
    //
    // String concatenation is used for the $N placeholders so the dollar sign
    // is a literal SQL character, not a JS template expression.
    var fieldNames  = Object.keys(updates);
    var fieldValues = Object.values(updates);

    // Build "field = $N" pairs; field values occupy $1 ... $fieldValues.length.
    var setClauses = [];
    for (var j = 0; j < fieldNames.length; j++) {
      setClauses.push(fieldNames[j] + ' = $' + (j + 1));
    }
    // Always refresh updated_at so the record reflects when it was last modified.
    setClauses.push('updated_at = NOW()');

    // id and user_id come after all field values in the params array.
    var idIndex  = fieldValues.length + 1;
    var uidIndex = fieldValues.length + 2;

    var sql =
      'UPDATE transactions ' +
      'SET ' + setClauses.join(', ') + ' ' +
      'WHERE id = $' + idIndex + ' AND user_id = $' + uidIndex + ' ' +
      'RETURNING id, user_id, category_id, type, amount, date, description, created_at, updated_at';

    // Final params: field values first, then id, then user_id.
    var finalParams = fieldValues.concat([id, req.user.id]);

    var result = await query(sql, finalParams);

    // No row returned means the transaction does not exist or is not owned by
    // this user -- both cases map to 404 (Req 5.3, 5.4).
    if (result.rows.length === 0) {
      throw new NotFoundError('Transaction not found.');
    }

    // HTTP 200 OK -- return the partially updated transaction record (Req 5.2).
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/transactions/:id
// DELETE -- removes the resource; 204 No Content is the conventional success response
// ---------------------------------------------------------------------------
// WHY DELETE?
// The client is requesting removal of a specific resource identified by :id.
// HTTP 204 No Content is the conventional success response for DELETE --
// the action was performed and there is no content to return (Req 6.1).
//
// Returns: 204 No Content on success.
// Returns: 404 if the transaction does not exist or is not owned by req.user.id.
//
// Requirements: 6.1, 6.2, 10.1
router.delete('/:id', async (req, res, next) => {
  // DELETE -- removes the resource; 204 No Content is the conventional success response
  try {
    var id = req.params.id;

    // Delete the transaction only if it belongs to the authenticated user.
    // The AND user_id = $2 clause enforces ownership -- a user cannot delete
    // another user's transaction even if they know its id (Req 6.2).
    // RETURNING id lets us detect whether a row was actually deleted without
    // a separate SELECT ownership check.
    var result = await query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      // No row deleted -- transaction not found or not owned by this user (Req 6.2).
      throw new NotFoundError('Transaction not found.');
    }

    // HTTP 204 No Content -- deletion succeeded; no body is returned (Req 6.1).
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
