CREATE TABLE IF NOT EXISTS customer (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT
);

INSERT INTO customer (name, email) VALUES
('Alice', 'alice@example.com'),
('Bob', 'bob@example.com');
