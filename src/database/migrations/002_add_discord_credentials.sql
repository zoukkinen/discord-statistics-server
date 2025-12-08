-- Migration: Add Discord credentials to events table
-- This migration adds secure storage for Discord tokens and guild IDs per event

-- Add Discord credentials columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS discord_token TEXT,
ADD COLUMN IF NOT EXISTS discord_guild_id TEXT;

-- Create index on discord_guild_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_discord_guild_id ON events(discord_guild_id);

-- Update existing events to use environment-based guild_id as discord_guild_id if no credentials set
-- This maintains backward compatibility for existing events
UPDATE events 
SET discord_guild_id = guild_id 
WHERE discord_token IS NULL 
AND discord_guild_id IS NULL;

-- Add constraint to ensure either both discord credentials are provided or neither
-- This allows for backward compatibility with environment variables
-- NOTE: discord_guild_id can be set from legacy guild_id while discord_token remains NULL
ALTER TABLE events 
ADD CONSTRAINT check_discord_credentials 
CHECK (
    (discord_token IS NULL) 
    OR 
    (discord_token IS NOT NULL AND discord_guild_id IS NOT NULL)
);

-- Add a comment explaining the security considerations
COMMENT ON COLUMN events.discord_token IS 'Encrypted Discord bot token for this event. NULL means use environment variable.';
COMMENT ON COLUMN events.discord_guild_id IS 'Discord guild (server) ID for this event. Can differ from legacy guild_id.';
