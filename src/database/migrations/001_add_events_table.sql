-- Migration: Add events table and link existing data
-- This migration creates the events system for multi-event support

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    description TEXT,
    guild_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure only one active event per guild
    CONSTRAINT unique_active_event_per_guild 
        EXCLUDE (guild_id WITH =) WHERE (is_active = true)
);

-- Add event_id to existing tables (nullable for backward compatibility)
ALTER TABLE member_stats 
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);

ALTER TABLE game_stats 
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);

ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS event_id INTEGER REFERENCES events(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_guild_id ON events(guild_id);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(guild_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_member_stats_event_id ON member_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_event_id ON game_stats(event_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_event_id ON game_sessions(event_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Migration function to create default event and link existing data
CREATE OR REPLACE FUNCTION migrate_existing_data_to_events(
    p_guild_id TEXT,
    p_event_name TEXT DEFAULT 'Assembly Summer 2025',
    p_start_date TIMESTAMPTZ DEFAULT '2025-07-31T07:00:00Z',
    p_end_date TIMESTAMPTZ DEFAULT '2025-08-03T13:00:00Z',
    p_timezone TEXT DEFAULT 'Europe/Helsinki',
    p_description TEXT DEFAULT 'Discord activity tracking for Assembly Summer 2025'
) RETURNS INTEGER AS $$
DECLARE
    v_event_id INTEGER;
    v_existing_data_count INTEGER;
BEGIN
    -- Check if we have existing data that needs migration
    SELECT COUNT(*) INTO v_existing_data_count 
    FROM member_stats 
    WHERE event_id IS NULL;
    
    -- Only create default event if we have unmigrated data or no events exist
    IF v_existing_data_count > 0 OR NOT EXISTS(SELECT 1 FROM events WHERE guild_id = p_guild_id) THEN
        
        -- Create or get the default event
        INSERT INTO events (name, start_date, end_date, timezone, description, guild_id, is_active)
        VALUES (p_event_name, p_start_date, p_end_date, p_timezone, p_description, p_guild_id, true)
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_event_id;
        
        -- If event already exists, get its ID
        IF v_event_id IS NULL THEN
            SELECT id INTO v_event_id 
            FROM events 
            WHERE guild_id = p_guild_id 
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;
        
        -- Link existing member_stats to the default event
        UPDATE member_stats 
        SET event_id = v_event_id 
        WHERE event_id IS NULL;
        
        -- Link existing game_stats to the default event  
        UPDATE game_stats 
        SET event_id = v_event_id 
        WHERE event_id IS NULL;
        
        -- Link existing game_sessions to the default event
        UPDATE game_sessions 
        SET event_id = v_event_id 
        WHERE event_id IS NULL;
        
        RAISE NOTICE 'Migration complete: Linked % member_stats records, % game_stats records, % game_sessions records to event "%"', 
            (SELECT COUNT(*) FROM member_stats WHERE event_id = v_event_id),
            (SELECT COUNT(*) FROM game_stats WHERE event_id = v_event_id),
            (SELECT COUNT(*) FROM game_sessions WHERE event_id = v_event_id),
            p_event_name;
    ELSE
        RAISE NOTICE 'No migration needed: All data already linked to events';
        -- Return the active event ID
        SELECT id INTO v_event_id FROM events WHERE guild_id = p_guild_id AND is_active = true LIMIT 1;
    END IF;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Note: The migration function will be called by the application when it starts up
-- This allows passing dynamic values from environment variables
