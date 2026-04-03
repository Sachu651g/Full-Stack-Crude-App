# Full Stack CRUD Project — Interview Q&A
### Project: NexusFinance Expense Tracker

---

## 1. Basic Project Questions

**Q: Explain your project in detail.**

My project is NexusFinance — a full-stack expense tracker web application. Users can register and log in securely, then add, edit, delete, and view their income and expense transactions. Each transaction is tagged with a category (like Food, Salary, Rent). The dashboard shows a financial summary with charts. There's also a Reports page for monthly and category-wise breakdowns, and Jack — an AI chatbot powered by Google Gemini that answers finance-related questions in English, Hindi, Kannada, and Telugu. The UI has a futuristic dark theme with animated video backgrounds.

---

**Q: What problem does your project solve?**

Most people struggle to track where their money goes. NexusFinance solves this by giving users a simple, visual way to log every income and expense, categorize it, and see reports over time. The AI chatbot (Jack) also helps users get instant financial advice without leaving the app.

---

**Q: What technologies did you use and why?**

- **React** — for building a fast, component-based frontend with smooth UI updates
- **Vite** — faster dev server and build tool compared to Create React App
- **Node.js + Express** — lightweight, non-blocking backend perfect for REST APIs
- **PostgreSQL** — relational database chosen because financial data has clear relationships (users → transactions → categories) and needs ACID guarantees
- **bcrypt** — for secure password hashing
- **JWT (jsonwebtoken)** — stateless authentication; no session storage needed on the server
- **Axios** — for HTTP requests from the frontend with interceptor support
- **Google Gemini API** — powers the Jack AI chatbot
- **Recharts** — for rendering charts on the dashboard and reports pages

---

**Q: How is your project different from others?**

- Has an integrated AI chatbot (Jack) that responds in multiple Indian languages automatically
- Futuristic dark UI with video backgrounds — not a typical plain CRUD app
- Full pagination and filtering on transactions
- Category-level conflict protection — can't delete a category that's in use
- Centralized error handling with typed errors mapped to correct HTTP status codes
- Separate summary and reports API with monthly and category-wise aggregation

---

## 2. Frontend Questions

**Q: How does your frontend communicate with backend?**

The frontend uses a custom Axios instance defined in `client.js`. Every request goes to the base URL (`/api` in development, proxied by Vite to `localhost:3001`). A request interceptor automatically attaches the JWT as a `Bearer` token in the `Authorization` header on every outgoing request. A response interceptor catches `401` responses and automatically logs the user out and redirects to `/login`.

---

**Q: What state management did you use?**

I used React Context API (`AuthContext`) for global authentication state — storing the JWT token and user info. This avoids prop drilling across components. For local UI state (form inputs, loading flags, error messages) I used `useState` and `useEffect` hooks directly in each component. No Redux was needed since the app state is simple enough for Context.

---

**Q: How did you handle form validation?**

On the backend, I used `express-validator` for the auth routes — it validates email format and password length before any database query runs. On the frontend, HTML5 `required` attributes and controlled inputs handle basic validation. The backend always returns field-level error messages (`{ field, message }`) which the frontend displays next to the relevant input.

---

**Q: How did you structure your components?**

```
src/
  pages/        — full page components (Dashboard, Transactions, Login, etc.)
  components/   — reusable UI pieces (AppLayout, JackChat, ProtectedRoute, CursorEffect)
  context/      — AuthContext for global auth state
  api/          — Axios client instance
```

`AppLayout` wraps all authenticated pages with the sidebar navigation. `ProtectedRoute` redirects unauthenticated users to `/login`. Each page manages its own data fetching and local state.

---

## 3. Backend Questions

**Q: Explain your API structure.**

The API is organized into route files mounted in `app.js`:

| Route prefix        | File                  | Purpose                          |
|---------------------|-----------------------|----------------------------------|
| `/api/auth`         | `routes/auth.js`      | Register and login               |
| `/api/categories`   | `routes/categories.js`| CRUD for categories              |
| `/api/transactions` | `routes/transactions.js` | CRUD + filter + pagination    |
| `/api`              | `routes/summary.js`   | Dashboard summary + reports      |
| `/api/chat`         | `routes/chat.js`      | Jack AI chatbot (Gemini proxy)   |
| `/api/health`       | `app.js`              | Health check endpoint            |

All routes except `/api/auth` and `/api/health` are protected by `authMiddleware`.

---

**Q: What is REST API?**

REST (Representational State Transfer) is an architectural style for building APIs over HTTP. Key principles:
- Resources are identified by URLs (e.g. `/api/transactions/5`)
- HTTP verbs define the action: `GET` (read), `POST` (create), `PUT` (full update), `PATCH` (partial update), `DELETE` (remove)
- Stateless — each request carries all the information needed (JWT token), no server-side session
- Responses use standard HTTP status codes (200, 201, 400, 401, 404, 409, 503)

In my project, for example: `POST /api/transactions` creates a transaction, `GET /api/transactions` lists them, `PUT /api/transactions/5` fully replaces one, `DELETE /api/transactions/5` removes it.

---

**Q: How do you handle errors in backend?**

I have a centralized error handler in `middleware/errorHandler.js`. All route handlers wrap their logic in `try/catch` and call `next(err)` on failure. The error handler maps typed error classes to HTTP status codes:

| Error Class       | HTTP Status |
|-------------------|-------------|
| `ValidationError` | 400         |
| `UnauthorizedError` | 401       |
| `NotFoundError`   | 404         |
| `ConflictError`   | 409         |
| `DatabaseError`   | 503         |
| Unexpected errors | 500         |

This means no route handler needs its own status-code logic — they just throw the right typed error.

---

**Q: How do you ensure security?**

- **Passwords** — never stored in plain text; hashed with `bcrypt` (10 salt rounds, OWASP recommended)
- **JWT** — tokens are signed with a secret key (`JWT_SECRET` env var), expire after 24 hours
- **Auth middleware** — every protected route verifies the JWT before any DB query runs
- **Ownership checks** — every query filters by `user_id = req.user.id` so users can only access their own data
- **SQL injection prevention** — all queries use parameterized placeholders (`$1, $2`) never string concatenation
- **Generic error messages** — login returns "Invalid credentials" regardless of whether email or password was wrong, preventing user enumeration
- **CORS** — configured to only allow requests from the known frontend origin

---

## 4. Database Questions

**Q: Why did you choose this database?**

I chose PostgreSQL because:
- Financial data is relational — users own transactions, transactions belong to categories
- PostgreSQL enforces data integrity with `CHECK` constraints (e.g. `amount > 0`, `type IN ('income','expense')`) and foreign keys
- ACID transactions ensure no partial writes
- It's free, open source, and widely supported on hosting platforms
- The `pg` Node.js driver is mature and well-documented

---

**Q: Explain your schema design.**

Three tables:

**users** — stores registered accounts
```sql
id, email (UNIQUE), password_hash, created_at
```

**categories** — system defaults (user_id IS NULL) and user-created categories
```sql
id, name, user_id (FK → users, nullable), created_at
UNIQUE(name, user_id)
```

**transactions** — each financial event
```sql
id, user_id (FK → users), category_id (FK → categories),
type ('income'|'expense'), amount (NUMERIC > 0), date, description,
created_at, updated_at
```

The `user_id IS NULL` pattern for system categories means one set of defaults is shared across all users without duplication.

---

**Q: What are indexes?**

An index is a data structure (usually a B-tree) that PostgreSQL maintains alongside a table to speed up lookups. Without an index, a query like `WHERE user_id = 5` scans every row. With an index on `user_id`, PostgreSQL jumps directly to matching rows.

In my project I created:
```sql
CREATE INDEX idx_transactions_user_date ON transactions (user_id, date DESC);
```
This speeds up the most common query pattern — fetching all transactions for a user ordered by date — which runs on every page load of the Transactions page.

---

**Q: How do you handle large data?**

- **Pagination** — the `GET /api/transactions` endpoint accepts `page` and `limit` query params (default 20 per page). It returns `{ data, pagination: { page, limit, total, totalPages } }` so the frontend never loads all rows at once
- **Filtering** — users can filter by type, category, and date range, reducing the result set before pagination
- **Indexes** — the composite index on `(user_id, date DESC)` keeps queries fast even with thousands of rows
- **COUNT optimization** — the total count query runs separately on the filtered set, not the full table

---

## 5. Advanced Questions

**Q: What happens if multiple users update same data?**

Each user can only access their own data — every query includes `AND user_id = $N`. So two users can never update the same transaction. For the same user on multiple devices, PostgreSQL handles concurrent writes with row-level locking. The `updated_at` timestamp is refreshed on every update, so the last write wins. For a production app, optimistic locking (sending `updated_at` in the request and checking it in the `WHERE` clause) would prevent lost updates.

---

**Q: How will you scale your application?**

- **Horizontal scaling** — since the backend is stateless (JWT, no server sessions), multiple Node.js instances can run behind a load balancer
- **Database connection pooling** — `pg.Pool` reuses connections instead of opening a new one per request
- **Caching** — summary/report queries could be cached in Redis since they're expensive aggregations that don't change every second
- **CDN** — static frontend assets (JS, CSS, videos) served from a CDN like Vercel's edge network
- **Read replicas** — PostgreSQL read replicas for heavy read traffic on reports

---

**Q: How will you improve performance?**

- Add Redis caching for dashboard summary data
- Lazy load chart libraries (Recharts) only on pages that need them
- Add database query result caching for category lists (they rarely change)
- Use `EXPLAIN ANALYZE` in PostgreSQL to identify slow queries
- Compress API responses with `compression` middleware in Express
- Implement virtual scrolling on the Transactions page for very large lists

---

**Q: How will you deploy your project?**

- **Frontend** — Vercel (automatic deploys from GitHub, global CDN, free tier)
- **Backend** — Render (Node.js web service, auto-deploys from GitHub)
- **Database** — Supabase or Render PostgreSQL (managed, automatic backups)
- **Environment variables** — `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `CORS_ORIGIN` set in each platform's dashboard, never committed to git
- The `render.yaml` file in the repo defines the backend service configuration for one-click deploys

---

## 6. AI Usage Questions

**Q: Where did you use AI in your project?**

AI is used in two ways:
1. **Jack chatbot** — a built-in AI assistant powered by Google Gemini 2.5 Flash. Users can ask finance-related questions and Jack responds in the user's language (English, Hindi, Kannada, Telugu) automatically
2. **Development assistance** — Kiro AI IDE was used to help scaffold boilerplate, write SQL migrations, and suggest code patterns. All generated code was reviewed and understood before use.

---

**Q: Did you modify AI-generated code?**

Yes. AI-generated code was always a starting point. I modified it to fit the project's specific requirements — for example, adjusting the JWT payload structure, adding ownership checks to every database query, customizing the error handler to use typed error classes, and tuning the Gemini prompt to make Jack respond in the correct language automatically.

---

**Q: How do you ensure correctness of AI code?**

- Read and understand every line before accepting it
- Test each endpoint manually (register, login, CRUD operations)
- Check that SQL queries use parameterized inputs, not string concatenation
- Verify HTTP status codes match REST conventions
- Check that auth middleware is applied to all protected routes
- Review error handling to ensure no sensitive info leaks to the client

---

**Q: Can you write the logic without AI?**

Yes. The core logic is standard Node.js/Express patterns I understand fully:
- JWT auth: `jwt.sign()` on login, `jwt.verify()` in middleware, attach to `req.user`
- bcrypt: `bcrypt.hash()` on register, `bcrypt.compare()` on login
- Parameterized SQL queries with `pg`
- Express router with `try/catch` and `next(err)`
- React Context for global state, `useEffect` for data fetching

---

## 7. Coding & Logic Questions

**Q: Explain one API logic in detail.**

**POST /api/auth/login:**

1. `express-validator` checks that email is valid format and password is not empty. If invalid → throw `ValidationError` → 400 response
2. Query `users` table: `SELECT id, email, password_hash FROM users WHERE email = $1`
3. If no user found, set `passwordMatch = false` (don't return early — prevents timing attacks)
4. `bcrypt.compare(submittedPassword, storedHash)` — timing-safe comparison
5. If `!user || !passwordMatch` → throw `UnauthorizedError('Invalid credentials')` → 401. Same message for both cases so attacker can't tell if email exists
6. `jwt.sign({ id, email }, JWT_SECRET, { expiresIn: '24h' })` → return token + user object with 200

---

**Q: What is time complexity of your operations?**

- **GET /api/transactions** — O(log n) for the index scan on `(user_id, date DESC)`, then O(k) to return k rows per page. The COUNT query is O(n) on the filtered set but the index makes it fast in practice
- **POST/PUT/DELETE** — O(log n) for the primary key lookup
- **GET /api/categories** — O(n) where n is the number of categories for the user, typically very small
- **bcrypt.hash/compare** — O(2^cost) intentionally — this is the security property, not a bug

---

**Q: How do you handle edge cases?**

- Empty or whitespace-only category names → trimmed and rejected with 400
- Deleting a category that has transactions → 409 Conflict with a clear message
- Accessing another user's transaction by guessing the ID → 404 (ownership check in WHERE clause)
- Registering with an existing email → 409 Conflict
- Expired or tampered JWT → 401 Unauthorized
- `amount = 0` or negative → rejected by both frontend validation and PostgreSQL `CHECK (amount > 0)`
- Invalid `type` value → rejected by `CHECK (type IN ('income','expense'))`
- PATCH with no valid fields → 400 "No valid fields provided for update"

---

**Q: Can you optimize your solution?**

Current optimizations already in place:
- Connection pooling with `pg.Pool`
- Composite index on `(user_id, date DESC)`
- Pagination to avoid loading all rows
- `RETURNING` clause to avoid extra SELECT after INSERT/UPDATE

Further optimizations possible:
- Cache the dashboard summary in Redis (TTL 60s) — it's an expensive aggregation
- Add a `name` column to the users table and cache it in the JWT to avoid a DB lookup on every profile page load
- Use `Promise.all()` to run independent DB queries in parallel (e.g. fetching summary stats)
- Add database query logging with timing to identify slow queries in production
