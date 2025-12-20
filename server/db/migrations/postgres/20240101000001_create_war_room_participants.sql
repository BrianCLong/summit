-- 20240101000001_create_war_room_participants.sql

CREATE TABLE war_room_participants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  war_room_id INTEGER NOT NULL REFERENCES war_rooms(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, war_room_id)
);

CREATE INDEX idx_war_room_participants_user_id ON war_room_participants(user_id);
CREATE INDEX idx_war_room_participants_war_room_id ON war_room_participants(war_room_id);
