-- seeds/categories.sql — Default category seed data
-- Inserts the 7 system-default categories required by Requirement 7.6.
-- System defaults have user_id = NULL so they are visible to every user.
-- Run after the migration:
--   psql $DATABASE_URL -f server/db/seeds/categories.sql

INSERT INTO categories (name, user_id) VALUES
    ('Food',          NULL),   -- groceries, restaurants, etc.
    ('Transport',     NULL),   -- fuel, public transit, ride-shares
    ('Salary',        NULL),   -- regular employment income
    ('Rent',          NULL),   -- housing / accommodation costs
    ('Entertainment', NULL),   -- movies, games, subscriptions
    ('Health',        NULL),   -- medical, pharmacy, gym
    ('Other',         NULL)    -- catch-all for uncategorised items
ON CONFLICT (name, user_id) DO NOTHING;  -- idempotent: safe to run multiple times
