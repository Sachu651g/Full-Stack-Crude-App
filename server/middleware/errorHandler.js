// middleware/errorHandler.js — Centralized Express error handler
//
// WHY A CENTRALIZED ERROR HANDLER?
// Without one, every route would need its own try/catch and status-code logic,
// leading to duplication and inconsistency.  Express supports a special
// 4-argument middleware signature (err, req, res, next) that it calls whenever
// a route calls `next(err)` or throws inside an async handler.
//
// REGISTRATION:
// This middleware MUST be registered AFTER all routes in app.js so that errors
// from any route bubble up to it.  See app.js for the mount point.
//
// RESPONSE FORMAT (Req 10.3):
// All error responses are JSON with at minimum:
//   { message: string }
// ValidationErrors also include:
//   { message: string, errors: Array<{ field, message }> }

const {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  DatabaseError,
} = require('./errors');

// ---------------------------------------------------------------------------
// errorHandler
// ---------------------------------------------------------------------------
// Parameters (Express convention for error-handling middleware):
//   err  – the Error object passed to next(err)
//   req  – the Express Request (unused here but required by the signature)
//   res  – the Express Response used to send the error reply
//   next – the next middleware (unused; included to satisfy Express's 4-arg check)
//
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // -------------------------------------------------------------------------
  // Log the error for server-side observability.
  // -------------------------------------------------------------------------
  // In production you would replace this with a structured logger (e.g. pino,
  // winston) and avoid logging sensitive data.  For now console.error is fine.
  console.error(`[ErrorHandler] ${err.name || 'Error'}: ${err.message}`);

  // -------------------------------------------------------------------------
  // Map error type → HTTP status code.
  // -------------------------------------------------------------------------
  // We use instanceof checks so subclasses are handled correctly.
  // The order matters: more specific checks should come before generic ones.

  if (err instanceof ValidationError) {
    // 400 Bad Request — invalid or missing input fields
    const body = { message: err.message };
    // Include field-level errors when present (e.g. express-validator output)
    if (err.errors && err.errors.length > 0) {
      body.errors = err.errors;
    }
    return res.status(400).json(body);
  }

  if (err instanceof UnauthorizedError) {
    // 401 Unauthorized — missing or invalid authentication
    return res.status(401).json({ message: err.message });
  }

  if (err instanceof NotFoundError) {
    // 404 Not Found — resource doesn't exist or isn't owned by this user
    return res.status(404).json({ message: err.message });
  }

  if (err instanceof ConflictError) {
    // 409 Conflict — uniqueness violation (duplicate email, category in use, etc.)
    return res.status(409).json({ message: err.message });
  }

  if (err instanceof DatabaseError) {
    // 503 Service Unavailable — database is unreachable (Req 11.5)
    return res.status(503).json({ message: err.message });
  }

  // -------------------------------------------------------------------------
  // Fallback: unexpected / untyped errors → 500 Internal Server Error
  // -------------------------------------------------------------------------
  // We deliberately hide the raw error message from the client to avoid
  // leaking implementation details or stack traces in production.
  return res.status(500).json({ message: 'Internal server error' });
};

module.exports = errorHandler;
