-- 20240101000002_create_war_room_permissions.sql

CREATE TABLE war_room_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL UNIQUE,
  capabilities TEXT[] NOT NULL
);

INSERT INTO war_room_permissions (role, capabilities) VALUES
  ('admin', '{"create_room", "delete_room", "add_participant", "remove_participant", "assign_role"}'),
  ('moderator', '{"add_participant", "remove_participant"}'),
  ('participant', '{}');
