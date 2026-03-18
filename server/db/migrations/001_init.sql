-- 001_init.sql — Initial database schema migration
-- Creates the three core tables: users, categories, and transactions.
-- Run this file once against your PostgreSQL database to set up the schema:
--   psql $DATABASE_URL -f server/db/migrations/001_init.sql

-- ---------------------------------------------------------------------------
-- users table
-- Stores registered user accounts. Passwords are stored as bcrypt hashes
-- (Requirement 1.4 — plaintext passwords must never be stored).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,   -- unique constraint enforces Req 1.2
    password_hash VARCHAR(255) NOT NULL,         -- bcrypt hash, never plaintext (Req 1.4)
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- categories table
-- Holds both system-default categories (user_id IS NULL) and user-created
-- categories (user_id references the owning user).
-- Requirement 7.6 — system defaults are seeded separately (see seeds/categories.sql).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- NULL = system default
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, user_id)   -- prevent duplicate names per user (NULLs are distinct in PG)
);

-- ---------------------------------------------------------------------------
-- transactions table
-- Each row represents a single financial event (income or expense) belonging
-- to one user and tagged with one category.
-- Requirement 11.1 — all transactions persisted in PostgreSQL.
-- Requirement 11.2 — amount must be positive (enforced by CHECK constraint).
-- Requirement 11.3 — type must be 'income' or 'expense' (enforced by CHECK).
-- Requirement 11.4 — date stored as DATE (ISO 8601 compatible).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER      NOT NULL REFERENCES categories(id),
    type        VARCHAR(10)  NOT NULL CHECK (type IN ('income', 'expense')),  -- Req 11.3
    amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),                    -- Req 11.2
    date        DATE         NOT NULL,                                         -- Req 11.4
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index on user_id + date to speed up the common query pattern:
-- "get all transactions for user X ordered by date desc"
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions (user_id, date DESC);
