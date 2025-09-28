CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Synthetic stored procedure to emulate saturation when invoked.
CREATE OR REPLACE FUNCTION orders_latency_spike()
RETURNS void AS $$
BEGIN
    PERFORM pg_sleep(0.5);
END;
$$ LANGUAGE plpgsql;
