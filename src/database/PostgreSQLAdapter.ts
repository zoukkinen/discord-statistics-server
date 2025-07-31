import { Client } from 'pg';
import { DatabaseAdapter, MemberStats, GameStats, GameSession } from './types';

export class PostgreSQLAdapter implements DatabaseAdapter {
    private client: Client | null = null;

    constructor() {
        // Use DATABASE_URL from Heroku or construct from individual env vars
        const connectionString = process.env.DATABASE_URL || this.buildConnectionString();
        
        this.client = new Client({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
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
            console.log('✅ PostgreSQL database initialized successfully');
        } catch (error) {
            console.error('❌ PostgreSQL database initialization failed:', error);
            throw error;
        }
    }

    private async createTables(): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');

        // Table for member count statistics
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS member_stats (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                total_members INTEGER NOT NULL,
                online_members INTEGER NOT NULL
            )
        `);

        // Table for game activity statistics
        await this.client.query(`
            CREATE TABLE IF NOT EXISTS game_stats (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                game_name TEXT NOT NULL,
                player_count INTEGER NOT NULL
            )
        `);

        // Table for individual game sessions
        await this.client.query(`
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
        await this.client.query(`CREATE INDEX IF NOT EXISTS idx_member_stats_timestamp ON member_stats(timestamp)`);
        await this.client.query(`CREATE INDEX IF NOT EXISTS idx_game_stats_timestamp ON game_stats(timestamp)`);
        await this.client.query(`CREATE INDEX IF NOT EXISTS idx_game_stats_game_name ON game_stats(game_name)`);
        await this.client.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id)`);
        await this.client.query(`CREATE INDEX IF NOT EXISTS idx_game_sessions_game_name ON game_sessions(game_name)`);
    }

    public async recordMemberCount(totalMembers: number, onlineMembers: number): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');

        await this.client.query(
            'INSERT INTO member_stats (total_members, online_members) VALUES ($1, $2)',
            [totalMembers, onlineMembers]
        );
    }

    public async recordGameActivity(gameName: string, playerCount: number): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');

        await this.client.query(
            'INSERT INTO game_stats (game_name, player_count) VALUES ($1, $2)',
            [gameName, playerCount]
        );
    }

    public async recordGameSession(userId: string, gameName: string, action: 'start' | 'end'): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');

        if (action === 'start') {
            // End any existing session for this user and game first
            await this.endActiveGameSession(userId, gameName);
            
            // Start new session
            await this.client.query(
                'INSERT INTO game_sessions (user_id, game_name) VALUES ($1, $2)',
                [userId, gameName]
            );
        } else if (action === 'end') {
            await this.endActiveGameSession(userId, gameName);
        }
    }

    private async endActiveGameSession(userId: string, gameName: string): Promise<void> {
        if (!this.client) throw new Error('Database not initialized');

        await this.client.query(`
            UPDATE game_sessions 
            SET end_time = CURRENT_TIMESTAMP,
                duration_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))/60
            WHERE user_id = $1 AND game_name = $2 AND end_time IS NULL
        `, [userId, gameName]);
    }

    public async getMemberStatsInRange(startDate: string, endDate: string): Promise<MemberStats[]> {
        if (!this.client) throw new Error('Database not initialized');

        const result = await this.client.query(`
            SELECT timestamp, total_members, online_members
            FROM member_stats
            WHERE timestamp BETWEEN $1 AND $2
            ORDER BY timestamp ASC
        `, [startDate, endDate]);

        return result.rows.map(row => ({
            timestamp: row.timestamp.toISOString(),
            total_members: row.total_members,
            online_members: row.online_members
        }));
    }

    public async getGameStatsInRange(startDate: string, endDate: string): Promise<GameStats[]> {
        if (!this.client) throw new Error('Database not initialized');

        const result = await this.client.query(`
            SELECT timestamp, game_name, player_count
            FROM game_stats
            WHERE timestamp BETWEEN $1 AND $2
            ORDER BY timestamp ASC
        `, [startDate, endDate]);

        return result.rows.map(row => ({
            timestamp: row.timestamp.toISOString(),
            game_name: row.game_name,
            player_count: row.player_count
        }));
    }

    public async getGameSessionsInRange(startDate: string, endDate: string): Promise<GameSession[]> {
        if (!this.client) throw new Error('Database not initialized');

        const result = await this.client.query(`
            SELECT id, user_id, game_name, start_time, end_time, duration_minutes
            FROM game_sessions
            WHERE start_time BETWEEN $1 AND $2
            ORDER BY start_time ASC
        `, [startDate, endDate]);

        return result.rows.map(row => ({
            id: row.id,
            user_id: row.user_id,
            game_name: row.game_name,
            start_time: row.start_time.toISOString(),
            end_time: row.end_time ? row.end_time.toISOString() : undefined,
            duration_minutes: row.duration_minutes
        }));
    }

    public async getTopGamesInRange(startDate: string, endDate: string, limit: number = 10): Promise<{game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number, unique_players: number}[]> {
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
            ORDER BY total_sessions DESC, total_minutes DESC
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

    public async getUserActivity(startDate: string, endDate: string): Promise<{
        user_id: string,
        game_name: string,
        action: 'started' | 'stopped',
        timestamp: string,
        session_duration?: number
    }[]> {
        if (!this.client) throw new Error('Database not initialized');

        const result = await this.client.query(`
            SELECT 
                user_id,
                game_name,
                start_time as timestamp,
                'started' as action,
                NULL as session_duration
            FROM game_sessions
            WHERE start_time BETWEEN $1 AND $2
            
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
            
            ORDER BY timestamp ASC
        `, [startDate, endDate]);

        return result.rows.map(row => ({
            user_id: row.user_id,
            game_name: row.game_name,
            action: row.action as 'started' | 'stopped',
            timestamp: row.timestamp.toISOString(),
            session_duration: row.session_duration
        }));
    }

    public async getCurrentStats(): Promise<{memberStats: MemberStats | null, currentGames: {game_name: string, player_count: number}[]}> {
        if (!this.client) throw new Error('Database not initialized');

        // Get latest member stats
        const memberResult = await this.client.query(`
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
        let gamesResult = await this.client.query(`
            SELECT game_name, 
                   COUNT(DISTINCT user_id) as player_count
            FROM game_sessions
            WHERE end_time IS NULL
            GROUP BY game_name
            HAVING COUNT(DISTINCT user_id) > 0
            ORDER BY COUNT(DISTINCT user_id) DESC
        `);
        
        let currentGames = gamesResult.rows.map(row => ({
            game_name: row.game_name,
            player_count: parseInt(row.player_count)
        }));
        
        // If no active sessions found, fallback to most recent game stats (within last 1 minute)
        if (currentGames.length === 0) {
            gamesResult = await this.client.query(`
                SELECT game_name, player_count
                FROM game_stats
                WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 minute'
                AND player_count > 0
                ORDER BY timestamp DESC, player_count DESC
            `);
            
            // Remove duplicates, keeping the most recent entry for each game
            const gameMap = new Map();
            gamesResult.rows.forEach(row => {
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

    public async getActiveSessions(): Promise<{user_id: string, game_name: string, start_time: string}[]> {
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

    public async close(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
            console.log('✅ PostgreSQL database connection closed');
        }
    }
}
