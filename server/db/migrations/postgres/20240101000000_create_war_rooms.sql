-- 20240101000000_create_war_rooms.sql

CREATE TABLE war_rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'active'
);

CREATE INDEX idx_war_rooms_created_by ON war_rooms(created_by);
CREATE INDEX idx_war_rooms_status ON war_rooms(status);
