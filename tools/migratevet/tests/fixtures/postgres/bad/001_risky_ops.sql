-- Full table rewrite without guard
ALTER TABLE customers
    ALTER COLUMN last_login TYPE TIMESTAMPTZ;

/* Drop column without IF EXISTS */
ALTER TABLE customers
    DROP COLUMN legacy_flag;

ALTER TYPE status ADD VALUE 'archived';

CREATE INDEX idx_customers_last_login ON customers (last_login);
