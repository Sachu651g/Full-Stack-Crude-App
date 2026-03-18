// middleware/authMiddleware.js — JWT authentication middleware
//
// WHY MIDDLEWARE?
// Express middleware is a function that sits in the request pipeline between
// the router and the route handler.  By extracting auth logic into its own
// middleware we can protect any route with a single `app.use(authMiddleware)`
// or by adding it as a route-level argument, keeping route handlers clean.
//
// FLOW:
//   1. Extract the Bearer token from the Authorization header.
//   2. Verify the token's signature and expiry using JWT_SECRET.
//   3a. Valid token  → attach decoded payload to req.user, call next().
//   3b. Invalid/missing → respond immediately with 401 JSON (Req 2.3).

const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// authMiddleware
// ---------------------------------------------------------------------------
// Protects routes that require an authenticated user.
//
// On success:
//   req.user is set to the decoded JWT payload: { id, email, iat, exp }
//   next() is called so the route handler can proceed.
//
// On failure:
//   Responds with HTTP 401 { message: 'Unauthorized' } and does NOT call
//   next(), so the route handler is never reached.
const authMiddleware = (req, res, next) => {
  // -------------------------------------------------------------------------
  // Step 1: Extract the token from the Authorization header.
  // -------------------------------------------------------------------------
  // The expected format is:  Authorization: Bearer <token>
  // `split(' ')[1]` isolates the token part after "Bearer ".
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No header or wrong scheme — reject immediately.
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  // -------------------------------------------------------------------------
  // Step 2: Verify the token.
  // -------------------------------------------------------------------------
  // jwt.verify() checks:
  //   - The signature (was this token signed with our JWT_SECRET?)
  //   - The expiry (has the `exp` claim passed?)
  // If either check fails it throws a JsonWebTokenError or TokenExpiredError.
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // -----------------------------------------------------------------------
    // Step 3a: Token is valid — attach the payload and continue.
    // -----------------------------------------------------------------------
    // We expose only the fields route handlers need (id, email).
    // The full decoded object also contains iat/exp but those are rarely used
    // in route logic.
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    // Pass control to the next middleware or route handler.
    next();
  } catch (err) {
    // -----------------------------------------------------------------------
    // Step 3b: Token is invalid or expired — return 401.
    // -----------------------------------------------------------------------
    // We intentionally return the same generic message for both cases so that
    // callers cannot distinguish "expired" from "tampered" (security best
    // practice — avoids leaking information about token state).
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = authMiddleware;
