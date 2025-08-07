import { Client, Pool, PoolClient } from 'pg';
import { DatabaseAdapter, MemberStats, GameStats, GameSession } from './types';
import { MigrationRunner } from './MigrationRunner';

export class PostgreSQLAdapter implements DatabaseAdapter {
    private client: Client | null = null;
    private pool: Pool | null = null;
    private guildId: string;

    constructor(guildId?: string) {
        // Use DATABASE_URL from Heroku or construct from individual env vars
        const connectionString = process.env.DATABASE_URL || this.buildConnectionString();
        
        // Create both client (for backward compatibility) and pool (for better performance)
        this.client = new Client({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            // Add connection timeout to prevent freezing
            connectionTimeoutMillis: 5000,
            query_timeout: 30000, // 30 second query timeout
        });

        this.pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            // Connection pool settings to prevent freezing
            max: 10, // Maximum number of connections in the pool
            min: 2,  // Minimum number of connections to keep open
            idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if no connection is available
            maxUses: 7500, // Close connections after 7500 uses
            allowExitOnIdle: true, // Allow the pool to exit when all connections are idle
        });

        // Store guild ID for migrations
        this.guildId = guildId || process.env.DISCORD_GUILD_ID || '';
    }

    /**
     * Get a database client from the pool (for temporary backward compatibility)
     */
    private async getClient(): Promise<PoolClient> {
        if (!this.pool) throw new Error('Database not initialized');
        return await this.pool.connect();
    }

    /**
     * Execute a database query with automatic connection management
     */
    private async query(text: string, params?: any[]): Promise<any> {
        if (!this.pool) throw new Error('Database not initialized');
        
        const client = await this.pool.connect();
        try {
            return await client.query(text, params);
        } finally {
            client.release();
        }
    }

    /**
     * Execute multiple queries in a transaction with automatic connection management
     */
    private async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        if (!this.pool) throw new Error('Database not initialized');
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    public async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up database connections...');
        
        if (this.client) {
            try {
                await this.client.end();
                console.log('✅ Client connection closed');
            } catch (error) {
                console.error('❌ Error closing client connection:', error);
            }
        }
        
        if (this.pool) {
            try {
                await this.pool.end();
                console.log('✅ Connection pool closed');
            } catch (error) {
                console.error('❌ Error closing connection pool:', error);
            }
        }
    }

    private buildConnectionString(): string {
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || '5432';
        const database = process.env.DB_NAME || 'discord_stats';
        const username = process.env.DB_USER || 'postgres';
        const password = process.env.DB_PASSWORD || '';
        
        return `postgresql://${username}:${password}@${host}:${port}/${database}`;
    }

    public async initialize(): Promise<void> {
        try {
            if (!this.client) throw new Error('PostgreSQL client not initialized');
            
            await this.client.connect();
            await this.createTables();
            
            // Run migrations after creating basic tables
            if (this.guildId) {
                const migrationRunner = new MigrationRunner(this.client, this.guildId);
                await migrationRunner.runMigrations();
            } else {
                console.warn('⚠️  No guild ID provided, skipping event migrations');
            }
            
            console.log('✅ PostgreSQL database initialized successfully');
            console.log(`📊 Connection pool configured: max ${this.pool?.options.max} connections`);
        } catch (error) {
            console.error('❌ PostgreSQL database initialization failed:', error);
            throw error;
        }
    }

    private async createTables(): Promise<void> {
        if (!this.pool) throw new Error('Database not initialized');

        const client = await this.pool.connect();
        try {
            // Table for member count statistics
            await client.query(`
                CREATE TABLE IF NOT EXISTS member_stats (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    total_members INTEGER NOT NULL,
                    online_members INTEGER NOT NULL
                )
            `);

            // Table for game activity statistics
            await client.query(`
                CREATE TABLE IF NOT EXISTS game_stats (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    game_name TEXT NOT NULL,
                    player_count INTEGER NOT NULL
                )
            `);

            // Table for individual game sessions
            await client.query(`
                CREATE TABLE IF NOT EXISTS game_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    game_name TEXT NOT NULL,
                    start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    end_time TIMESTAMPTZ,
                    duration_minutes INTEGER
                )
            `);

            // Create indexes for better query performance
            await client.query(`CREATE INDEX IF NOT EXISTS idx_member_stats_timestamp ON member_stats(timestamp)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_game_stats_timestamp ON game_stats(timestamp)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_game_stats_game_name ON game_stats(game_name)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id)`);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_game_name ON game_sessions(game_name)`);
        } finally {
            client.release();
        }
    }

    /**
     * Get the current event ID for the guild, falling back to a default event
     */
    private async getCurrentEventId(): Promise<number> {
        if (!this.pool) throw new Error('Database not initialized');
        
        const guildId = process.env.DISCORD_GUILD_ID || '';
        
        const client = await this.pool.connect();
        try {
            // Try to get the active event for this guild
            const activeResult = await client.query(
                'SELECT id FROM events WHERE guild_id = $1 AND is_active = true LIMIT 1',
                [guildId]
            );
            
            if (activeResult.rows.length > 0) {
                return activeResult.rows[0].id;
            }
            
            // Fall back to any event for this guild
            const anyResult = await client.query(
                'SELECT id FROM events WHERE guild_id = $1 ORDER BY created_at DESC LIMIT 1',
                [guildId]
            );
            
            if (anyResult.rows.length > 0) {
                return anyResult.rows[0].id;
            }
            
            throw new Error('No events found for this guild. Run migrations first.');
        } finally {
            client.release();
        }
    }

    public async recordMemberStats(stats: MemberStats, eventId?: number): Promise<void> {
        const currentEventId = eventId || await this.getCurrentEventId();
        
        await this.transaction(async (client) => {
            await client.query(
                'INSERT INTO member_stats (total_members, online_members, event_id) VALUES ($1, $2, $3)',
                [stats.total_members, stats.online_members, currentEventId]
            );
            
            await client.query(
                'UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [currentEventId]
            );
        });
    }

    public async recordMemberCount(totalMembers: number, onlineMembers: number, eventId?: number): Promise<void> {
        const currentEventId = eventId || await this.getCurrentEventId();
        
        await this.transaction(async (client) => {
            await client.query(
                'INSERT INTO member_stats (total_members, online_members, event_id) VALUES ($1, $2, $3)',
                [totalMembers, onlineMembers, currentEventId]
            );
            
            await client.query(
                'UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [currentEventId]
            );
        });
    }

    public async recordGameActivity(gameName: string, playerCount: number, eventId?: number): Promise<void> {
        const currentEventId = eventId || await this.getCurrentEventId();
        
        await this.query(
            'INSERT INTO game_stats (game_name, player_count, event_id) VALUES ($1, $2, $3)',
            [gameName, playerCount, currentEventId]
        );
    }

    public async recordGameSession(userId: string, gameName: string, action: 'start' | 'end', eventId?: number): Promise<void> {
        const currentEventId = eventId || await this.getCurrentEventId();

        if (action === 'start') {
            // End any existing session for this user and game first
            await this.endActiveGameSession(userId, gameName);
            
            // Start new session
            await this.query(
                'INSERT INTO game_sessions (user_id, game_name, event_id) VALUES ($1, $2, $3)',
                [userId, gameName, currentEventId]
            );
        } else if (action === 'end') {
            await this.endActiveGameSession(userId, gameName);
        }
    }

    private async endActiveGameSession(userId: string, gameName: string): Promise<void> {
        await this.query(`
            UPDATE game_sessions 
            SET end_time = CURRENT_TIMESTAMP,
                duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))/60
            WHERE user_id = $1 AND game_name = $2 AND end_time IS NULL
        `, [userId, gameName]);
    }

    public async getMemberStatsInRange(startDate: string, endDate: string, eventId?: number): Promise<MemberStats[]> {
        let query = `
            SELECT timestamp, total_members, online_members, event_id
            FROM member_stats
            WHERE timestamp BETWEEN $1 AND $2
        `;
        let params: any[] = [startDate, endDate];

        if (eventId) {
            query += ` AND event_id = $3`;
            params.push(eventId);
        }

        query += ` ORDER BY timestamp ASC`;

        const result = await this.query(query, params);

        return result.rows.map((row: any) => ({
            timestamp: row.timestamp.toISOString(),
            total_members: row.total_members,
            online_members: row.online_members,
            event_id: row.event_id
        }));
    }

    public async getGameStatsInRange(startDate: string, endDate: string, eventId?: number): Promise<GameStats[]> {
        let query = `
            SELECT timestamp, game_name, player_count, event_id
            FROM game_stats
            WHERE timestamp BETWEEN $1 AND $2
        `;
        let params: any[] = [startDate, endDate];

        if (eventId) {
            query += ` AND event_id = $3`;
            params.push(eventId);
        }

        query += ` ORDER BY timestamp ASC`;

        const result = await this.query(query, params);

        return result.rows.map((row: any) => ({
            timestamp: row.timestamp.toISOString(),
            game_name: row.game_name,
            player_count: row.player_count,
            event_id: row.event_id
        }));
    }

    public async getGameSessionsInRange(startDate: string, endDate: string, eventId?: number): Promise<GameSession[]> {
        const result = await this.query(`
            SELECT id, user_id, game_name, start_time, end_time, duration_minutes
            FROM game_sessions
            WHERE start_time BETWEEN $1 AND $2
            ORDER BY start_time ASC
        `, [startDate, endDate]);

        return result.rows.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            game_name: row.game_name,
            start_time: row.start_time.toISOString(),
            end_time: row.end_time ? row.end_time.toISOString() : undefined,
            duration_minutes: row.duration_minutes
        }));
    }

    public async getTopGamesInRange(startDate: string, endDate: string, limit: number = 10, eventId?: number): Promise<{game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number, unique_players: number}[]> {
        if (!this.client) throw new Error('Database not initialized');

        const result = await this.client.query(`
            SELECT 
                game_name,
                COUNT(*) as total_sessions,
                COALESCE(ROUND(SUM(
                    CASE 
                        WHEN duration_minutes IS NOT NULL THEN duration_minutes
                        WHEN end_time IS NULL THEN EXTRACT(EPOCH FROM (NOW() - start_time)) / 60
                        ELSE 0
                    END
                )::numeric, 2), 0) as total_minutes,
                COALESCE(ROUND(AVG(
                    CASE 
                        WHEN duration_minutes IS NOT NULL THEN duration_minutes
                        WHEN end_time IS NULL THEN EXTRACT(EPOCH FROM (NOW() - start_time)) / 60
                        ELSE 0
                    END
                )::numeric, 2), 0) as avg_minutes,
                COUNT(DISTINCT user_id) as unique_players
            FROM game_sessions
            WHERE start_time BETWEEN $1 AND $2
            GROUP BY game_name
            ORDER BY total_minutes DESC, total_sessions DESC
            LIMIT $3
        `, [startDate, endDate, limit]);

        return result.rows.map(row => ({
            game_name: row.game_name,
            total_sessions: parseInt(row.total_sessions),
            total_minutes: parseFloat(row.total_minutes),
            avg_minutes: parseFloat(row.avg_minutes),
            unique_players: parseInt(row.unique_players)
        }));
    }

    public async getUserActivity(startDate: string, endDate: string, eventId?: number): Promise<{
        user_id: string,
        game_name: string,
        action: 'started' | 'stopped',
        timestamp: string,
        session_duration?: number
    }[]> {
        if (!this.client) throw new Error('Database not initialized');

        const currentEventId = eventId || await this.getCurrentEventId();
        
        const result = await this.client.query(`
            SELECT 
                user_id,
                game_name,
                start_time as timestamp,
                'started' as action,
                NULL as session_duration
            FROM game_sessions
            WHERE start_time BETWEEN $1 AND $2
            AND event_id = $3
            
            UNION ALL
            
            SELECT 
                user_id,
                game_name,
                end_time as timestamp,
                'stopped' as action,
                duration_minutes as session_duration
            FROM game_sessions
            WHERE end_time BETWEEN $1 AND $2
            AND end_time IS NOT NULL
            AND event_id = $3
            
            ORDER BY timestamp ASC
        `, [startDate, endDate, currentEventId]);

        return result.rows.map(row => ({
            user_id: row.user_id,
            game_name: row.game_name,
            action: row.action as 'started' | 'stopped',
            timestamp: row.timestamp.toISOString(),
            session_duration: row.session_duration
        }));
    }

    public async getCurrentStats(eventId?: number): Promise<{memberStats: MemberStats | null, currentGames: {game_name: string, player_count: number}[]}> {
        // Get latest member stats
        const memberResult = await this.query(`
            SELECT timestamp, total_members, online_members
            FROM member_stats
            ORDER BY timestamp DESC
            LIMIT 1
        `);

        const memberStats = memberResult.rows.length > 0 ? {
            timestamp: memberResult.rows[0].timestamp.toISOString(),
            total_members: memberResult.rows[0].total_members,
            online_members: memberResult.rows[0].online_members
        } : null;

        // Get current games from active sessions (real-time) - fallback to recent game stats if no sessions
        let gamesResult = await this.query(`
            SELECT game_name, 
                   COUNT(DISTINCT user_id) as player_count
            FROM game_sessions
            WHERE end_time IS NULL
            GROUP BY game_name
            HAVING COUNT(DISTINCT user_id) > 0
            ORDER BY COUNT(DISTINCT user_id) DESC
        `);
        
        let currentGames = gamesResult.rows.map((row: any) => ({
            game_name: row.game_name,
            player_count: parseInt(row.player_count)
        }));
        
        // If no active sessions found, fallback to most recent game stats (within last 1 minute)
        if (currentGames.length === 0) {
            gamesResult = await this.query(`
                SELECT game_name, player_count
                FROM game_stats
                WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
                AND player_count > 0
                ORDER BY timestamp DESC, player_count DESC
            `);
            
            // Remove duplicates, keeping the most recent entry for each game
            const gameMap = new Map();
            gamesResult.rows.forEach((row: any) => {
                if (!gameMap.has(row.game_name)) {
                    gameMap.set(row.game_name, {
                        game_name: row.game_name,
                        player_count: row.player_count
                    });
                }
            });
            currentGames = Array.from(gameMap.values());
        }

        return { memberStats, currentGames };
    }

    public async cleanupStaleGameSessions(): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');

        await this.client.query(`
            UPDATE game_sessions 
            SET end_time = CURRENT_TIMESTAMP,
                duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))/60
            WHERE end_time IS NULL 
            AND start_time < CURRENT_TIMESTAMP - INTERVAL '8 hours'
        `);
        
        console.log('🧹 Cleaned up stale game sessions');
    }

    public async getActiveSessions(eventId?: number): Promise<{user_id: string, game_name: string, start_time: string}[]> {
        if (!this.client) throw new Error('Database not initialized');

        const result = await this.client.query(`
            SELECT user_id, game_name, start_time
            FROM game_sessions
            WHERE end_time IS NULL
            AND start_time >= CURRENT_TIMESTAMP - INTERVAL '8 hours'
        `);

        return result.rows.map(row => ({
            user_id: row.user_id,
            game_name: row.game_name,
            start_time: row.start_time.toISOString()
        }));
    }

    // ===== EVENT MANAGEMENT METHODS =====
    // TODO: Implement these methods for full multi-event support

    public async createEvent(event: any): Promise<any> {
        if (!this.client) throw new Error('Database not initialized');
        
        const result = await this.client.query(`
            INSERT INTO events (name, description, start_date, end_date, timezone, guild_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            event.name,
            event.description,
            event.start_date,
            event.end_date,
            event.timezone,
            event.guild_id,
            event.is_active || false
        ]);
        
        return result.rows[0];
    }

    public async getEvents(guildId: string): Promise<any[]> {
        if (!this.client) throw new Error('Database not initialized');
        
        const result = await this.client.query(`
            SELECT * FROM events 
            WHERE guild_id = $1 
            ORDER BY created_at DESC
        `, [guildId]);
        
        return result.rows;
    }

    public async getActiveEvent(guildId: string): Promise<any> {
        if (!this.client) throw new Error('Database not initialized');
        
        const result = await this.client.query(`
            SELECT * FROM events 
            WHERE guild_id = $1 AND is_active = true 
            LIMIT 1
        `, [guildId]);
        
        return result.rows[0] || null;
    }

    public async updateEvent(id: number, updates: any): Promise<any> {
        if (!this.client) throw new Error('Database not initialized');
        
        const fields = [];
        const values = [];
        let paramIndex = 1;
        
        for (const [key, value] of Object.entries(updates)) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
        
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        
        values.push(id);
        
        const result = await this.client.query(`
            UPDATE events 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);
        
        return result.rows[0];
    }

    public async setActiveEvent(guildId: string, eventId: number): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');
        
        // First, deactivate all events for this guild
        await this.client.query(`
            UPDATE events 
            SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE guild_id = $1
        `, [guildId]);
        
        // Then activate the specified event
        await this.client.query(`
            UPDATE events 
            SET is_active = true, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND guild_id = $2
        `, [eventId, guildId]);
    }

    public async getEventStats(eventId: number): Promise<any> {
        if (!this.client) throw new Error('Database not initialized');
        
        const result = await this.client.query(`
            SELECT 
                e.*,
                COUNT(DISTINCT ms.id) as member_stat_count,
                COUNT(DISTINCT gs.id) as game_stat_count,
                COUNT(DISTINCT gss.id) as game_session_count,
                COUNT(DISTINCT gss.game_name) as unique_games_count,
                COUNT(DISTINCT gss.user_id) as unique_players_count
            FROM events e
            LEFT JOIN member_stats ms ON ms.event_id = e.id
            LEFT JOIN game_stats gs ON gs.event_id = e.id
            LEFT JOIN game_sessions gss ON gss.event_id = e.id
            WHERE e.id = $1
            GROUP BY e.id
        `, [eventId]);
        
        return result.rows[0];
    }

    public async getEventSummaries(guildId: string): Promise<any[]> {
        if (!this.client) throw new Error('Database not initialized');
        
        const result = await this.client.query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.start_date,
                e.end_date,
                e.timezone,
                e.is_active,
                e.created_at,
                COUNT(DISTINCT gss.user_id) as unique_players,
                COUNT(DISTINCT gss.game_name) as unique_games,
                COUNT(gss.id) as total_sessions,
                COALESCE(SUM(gss.duration_minutes), 0) as total_minutes
            FROM events e
            LEFT JOIN game_sessions gss ON gss.event_id = e.id
            WHERE e.guild_id = $1
            GROUP BY e.id, e.name, e.description, e.start_date, e.end_date, e.timezone, e.is_active, e.created_at
            ORDER BY e.created_at DESC
        `, [guildId]);
        
        return result.rows;
    }

    public async close(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
            console.log('✅ PostgreSQL database connection closed');
        }
    }
}
