// middleware/errors.js — Custom application error classes
//
// WHY CUSTOM ERROR CLASSES?
// Using typed errors lets the centralized error handler (errorHandler.js)
// inspect `err.constructor.name` (or `instanceof`) and map each error type to
// the correct HTTP status code without scattering status-code logic across
// every route handler.
//
// All classes extend the built-in Error so they work naturally with
// `throw`, `try/catch`, and Express's `next(err)` pattern.

// ---------------------------------------------------------------------------
// ValidationError — HTTP 400 Bad Request
// ---------------------------------------------------------------------------
// Thrown when request input fails validation (missing fields, wrong types, etc.)
// Optionally carries a structured `errors` array for field-level messages.
class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    // `errors` is an optional array of { field, message } objects so the
    // client can display per-field feedback (Req 1.3, 3.2, 3.3).
    this.errors = errors;
  }
}

// ---------------------------------------------------------------------------
// UnauthorizedError — HTTP 401 Unauthorized
// ---------------------------------------------------------------------------
// Thrown when a request lacks valid authentication credentials.
class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// ---------------------------------------------------------------------------
// NotFoundError — HTTP 404 Not Found
// ---------------------------------------------------------------------------
// Thrown when a requested resource does not exist or does not belong to the
// authenticated user (ownership check returns nothing).
class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// ---------------------------------------------------------------------------
// ConflictError — HTTP 409 Conflict
// ---------------------------------------------------------------------------
// Thrown when an operation would violate a uniqueness constraint, e.g.:
//   - registering with an email that already exists (Req 1.2)
//   - deleting a category that is still referenced by transactions (Req 7.5)
class ConflictError extends Error {
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

// ---------------------------------------------------------------------------
// DatabaseError — HTTP 503 Service Unavailable
// ---------------------------------------------------------------------------
// Thrown (or re-thrown) when the database is unreachable or returns an
// unexpected infrastructure-level error (Req 11.5).
class DatabaseError extends Error {
  constructor(message = 'Service temporarily unavailable') {
    super(message);
    this.name = 'DatabaseError';
  }
}

module.exports = {
  ValidationError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  DatabaseError,
};
