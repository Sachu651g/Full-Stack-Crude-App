// routes/auth.js — Authentication routes: registration and login
//
// WHY THIS FILE?
// Centralises all auth-related HTTP handlers so app.js stays clean.
// Each handler follows the same pattern:
//   1. Validate input with express-validator
//   2. Interact with the database via the `query` helper
//   3. Return a signed JWT or throw a typed error for the global handler

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { query } = require('../db/pool');
const { ValidationError, ConflictError, UnauthorizedError } = require('../middleware/errors');

const router = express.Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// bcrypt work factor — 10 is the OWASP-recommended minimum that balances
// security (resistance to brute-force) with acceptable server latency (~100ms).
const SALT_ROUNDS = 10;

// JWT expiry — 24 hours gives users a full day of seamless access before they
// must re-authenticate (Req 2.1).
const JWT_EXPIRY = '24h';

// ---------------------------------------------------------------------------
// Helper: sign a JWT for a given user
// ---------------------------------------------------------------------------
// Encodes only the minimal payload needed by downstream middleware (authMiddleware.js):
//   id    — used to scope database queries to the authenticated user
//   email — useful for logging and display without an extra DB round-trip
//
// The secret is read from the JWT_SECRET environment variable so it is never
// hard-coded in source control.
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// ---------------------------------------------------------------------------
// Validation chains (express-validator)
// ---------------------------------------------------------------------------
// Defined once and reused in the route definitions below.
// Using express-validator keeps validation declarative and co-located with
// the route, making it easy to see what each endpoint expects.

// Registration validation rules
const registerValidation = [
  // email must be a well-formed address; normalizeEmail trims whitespace and
  // lowercases the domain so "User@Example.COM" and "user@example.com" are
  // treated as the same address.
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),

  // password must be at least 8 characters (Req 1.3).
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

// Login validation rules — same shape as registration but we only need to
// check that the fields are present; the real credential check is done in the
// handler against the database.
const loginValidation = [
  body('email')
    .isEmail().withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// ---------------------------------------------------------------------------
// POST /api/auth/register
// POST — creates a new user resource; URI assigned by server
// ---------------------------------------------------------------------------
// WHY POST?
// The client is asking the server to create a new subordinate resource (a User).
// The resource does not yet exist and its URI (/api/users/:id) is determined by
// the server after insertion — the canonical reason to use POST over PUT.
//
// Flow:
//   1. Run express-validator rules; surface field errors as 400 ValidationError
//   2. Check the `users` table for an existing row with the same email (409 ConflictError)
//   3. Hash the plaintext password with bcrypt so we NEVER store it in plain text (Req 1.4)
//   4. Insert the new user row and retrieve the generated id
//   5. Sign and return a JWT so the client is immediately authenticated (Req 1.1)
router.post(
  '/register',
  registerValidation,
  async (req, res, next) => {
    // POST — creates a new user resource; URI assigned by server
    try {
      // Step 1 — Check express-validator results.
      // `validationResult` collects all rule failures into a structured object.
      // If any rule failed, map them to { field, message } pairs and throw a
      // ValidationError so the global error handler returns HTTP 400 (Req 1.3).
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const fieldErrors = errors.array().map((e) => ({
          field: e.path,
          message: e.msg,
        }));
        throw new ValidationError('Validation failed.', fieldErrors);
      }

      const { email, password } = req.body;

      // Step 2 — Duplicate email check.
      // Query the users table for any row with this email.  If one exists we
      // must return 409 Conflict rather than silently overwriting the account
      // or leaking which emails are registered (Req 1.2).
      const existing = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.rows.length > 0) {
        throw new ConflictError('An account with that email already exists.');
      }

      // Step 3 — Hash the password.
      // bcrypt.hash() generates a random salt internally and applies it
      // SALT_ROUNDS times, making rainbow-table and brute-force attacks
      // computationally expensive.  The resulting string includes the salt so
      // bcrypt.compare() can verify it later without storing the salt separately.
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Step 4 — Insert the new user.
      // RETURNING id, email avoids a second SELECT round-trip; pg returns the
      // inserted row directly.
      const result = await query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, passwordHash]
      );
      const newUser = result.rows[0];

      // Step 5 — Issue a JWT.
      // The token payload contains id and email (see signToken above).
      // The client stores this token and sends it as a Bearer token on every
      // subsequent request (Req 2.3).
      const token = signToken(newUser);

      // HTTP 201 Created — a new resource was successfully created (Req 1.1).
      res.status(201).json({ token, user: { id: newUser.id, email: newUser.email } });
    } catch (err) {
      // Pass any error (typed or unexpected) to the global error handler so
      // it can map it to the correct HTTP status code (Req 10.3).
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/auth/login
// POST — initiates a session by creating a new JWT token resource
// ---------------------------------------------------------------------------
// WHY POST?
// A login creates a new session/token resource on the server side.  The
// operation is not idempotent (each call may produce a different token with a
// different expiry), which rules out PUT.  POST is the correct verb for
// non-idempotent resource creation.
//
// Flow:
//   1. Run express-validator rules; surface field errors as 400 ValidationError
//   2. Look up the user by email — if not found, return 401 (generic message)
//   3. Compare the submitted password against the stored bcrypt hash
//   4. If the hash matches, sign and return a JWT (Req 2.1)
//   5. If the hash does not match, return 401 with a GENERIC message (Req 2.2)
//      — never reveal whether the email or the password was wrong, as that
//        would allow an attacker to enumerate valid email addresses.
router.post(
  '/login',
  loginValidation,
  async (req, res, next) => {
    // POST — initiates a session by creating a new JWT token resource
    try {
      // Step 1 — Validate input fields.
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const fieldErrors = errors.array().map((e) => ({
          field: e.path,
          message: e.msg,
        }));
        throw new ValidationError('Validation failed.', fieldErrors);
      }

      const { email, password } = req.body;

      // Step 2 — Look up the user by email.
      // We select password_hash so we can compare it in step 3.
      // If no row is found we still fall through to the generic 401 rather
      // than returning early with a "user not found" message, which would
      // leak account existence information (Req 2.2).
      const result = await query(
        'SELECT id, email, password_hash FROM users WHERE email = $1',
        [email]
      );
      const user = result.rows[0];

      // Step 3 — Compare the submitted password against the stored hash.
      // bcrypt.compare() is timing-safe: it always runs the full comparison
      // even if the user does not exist (we pass an empty string in that case)
      // to prevent timing-based user enumeration attacks.
      const passwordMatch = user
        ? await bcrypt.compare(password, user.password_hash)
        : false;

      // Step 4/5 — Issue JWT on success, or throw 401 on failure.
      // The error message is intentionally generic ("Invalid credentials") so
      // the client cannot distinguish between a wrong email and a wrong password
      // (Req 2.2).
      if (!user || !passwordMatch) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Sign the token with the user's id and email (Req 2.1).
      const token = signToken(user);

      // HTTP 200 OK — the login succeeded and a token is returned.
      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
