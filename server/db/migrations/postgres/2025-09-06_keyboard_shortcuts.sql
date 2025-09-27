-- User keyboard shortcuts customization
CREATE TABLE IF NOT EXISTS user_keyboard_shortcuts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_id TEXT NOT NULL,
  keys TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, action_id)
);

CREATE INDEX IF NOT EXISTS user_keyboard_shortcuts_user_idx
  ON user_keyboard_shortcuts(user_id);

CREATE INDEX IF NOT EXISTS user_keyboard_shortcuts_action_idx
  ON user_keyboard_shortcuts(action_id);
