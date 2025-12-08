-- Migration: Add is_hidden field to events table
-- This migration adds support for hiding events from the frontend

-- Add is_hidden column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Create index for querying visible events
CREATE INDEX IF NOT EXISTS idx_events_visible ON events(guild_id, is_hidden) WHERE is_hidden = false;

-- Add comment for documentation
COMMENT ON COLUMN events.is_hidden IS 'Hide this event from the frontend display (e.g., for past or cancelled events)';
