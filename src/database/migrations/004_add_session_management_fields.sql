-- Migration: Add session management fields to game_sessions table
-- Adds game_name_alias for bulk renaming and is_removed for session exclusion

ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS game_name_alias TEXT,
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index: makes all stats queries that filter is_removed = FALSE fast
CREATE INDEX IF NOT EXISTS idx_game_sessions_active
  ON game_sessions(event_id, is_removed)
  WHERE is_removed = FALSE;

-- Index for bulk rename lookups (finding sessions by original game name)
CREATE INDEX IF NOT EXISTS idx_game_sessions_effective_name
  ON game_sessions(event_id, game_name);

-- Add comments for documentation
COMMENT ON COLUMN game_sessions.game_name_alias IS 'Admin alias display name; replaces game_name in all stats calculations via COALESCE';
COMMENT ON COLUMN game_sessions.is_removed IS 'When TRUE this session is excluded from all stats; still visible to admins';
