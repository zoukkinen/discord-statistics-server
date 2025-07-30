import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

export interface MemberStats {
    timestamp: string;
    total_members: number;
    online_members: number;
}

export interface GameStats {
    timestamp: string;
    game_name: string;
    player_count: number;
}

export interface GameSession {
    id: number;
    user_id: string;
    game_name: string;
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
}

export class Database {
    private db: sqlite3.Database | null = null;
    private dbPath: string;

    constructor() {
        this.dbPath = process.env.DATABASE_PATH || './data/discord_stats.db';
    }

    public async initialize(): Promise<void> {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            this.db = new sqlite3.Database(this.dbPath);
            
            await this.createTables();
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    private async createTables(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const runAsync = promisify(this.db.run.bind(this.db));

        // Table for member count statistics
        await runAsync(`
            CREATE TABLE IF NOT EXISTS member_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                total_members INTEGER NOT NULL,
                online_members INTEGER NOT NULL
            )
        `);

        // Table for game activity statistics
        await runAsync(`
            CREATE TABLE IF NOT EXISTS game_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                game_name TEXT NOT NULL,
                player_count INTEGER NOT NULL
            )
        `);

        // Table for individual game sessions
        await runAsync(`
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                game_name TEXT NOT NULL,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                duration_minutes INTEGER
            )
        `);

        // Create indexes for better query performance
        await runAsync(`CREATE INDEX IF NOT EXISTS idx_member_stats_timestamp ON member_stats(timestamp)`);
        await runAsync(`CREATE INDEX IF NOT EXISTS idx_game_stats_timestamp ON game_stats(timestamp)`);
        await runAsync(`CREATE INDEX IF NOT EXISTS idx_game_stats_game_name ON game_stats(game_name)`);
        await runAsync(`CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id)`);
        await runAsync(`CREATE INDEX IF NOT EXISTS idx_game_sessions_game_name ON game_sessions(game_name)`);
    }

    public async recordMemberCount(totalMembers: number, onlineMembers: number): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.run(
                'INSERT INTO member_stats (total_members, online_members) VALUES (?, ?)',
                [totalMembers, onlineMembers],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async recordGameActivity(gameName: string, playerCount: number): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.run(
                'INSERT INTO game_stats (game_name, player_count) VALUES (?, ?)',
                [gameName, playerCount],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    public async recordGameSession(userId: string, gameName: string, action: 'start' | 'end'): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        if (action === 'start') {
            // End any existing session for this user and game first
            await this.endActiveGameSession(userId, gameName);
            
            // Start new session
            return new Promise((resolve, reject) => {
                this.db!.run(
                    'INSERT INTO game_sessions (user_id, game_name) VALUES (?, ?)',
                    [userId, gameName],
                    function(err) {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } else if (action === 'end') {
            await this.endActiveGameSession(userId, gameName);
        }
    }

    private async endActiveGameSession(userId: string, gameName: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.run(`
                UPDATE game_sessions 
                SET end_time = CURRENT_TIMESTAMP,
                    duration_minutes = CAST((julianday(CURRENT_TIMESTAMP) - julianday(start_time)) * 24 * 60 AS INTEGER)
                WHERE user_id = ? AND game_name = ? AND end_time IS NULL
            `, [userId, gameName], function(err) {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async getMemberStatsHistory(hours: number = 24): Promise<MemberStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        const allAsync = promisify(this.db.all.bind(this.db));
        
        const rows = await allAsync(`
            SELECT timestamp, total_members, online_members
            FROM member_stats
            WHERE timestamp >= datetime('now', '-${hours} hours')
            ORDER BY timestamp ASC
        `) as MemberStats[];

        return rows;
    }

    public async getMemberStatsHistoryByDateRange(startDate: string, endDate: string): Promise<MemberStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT timestamp, total_members, online_members
                FROM member_stats
                WHERE timestamp >= ? AND timestamp <= ?
                ORDER BY timestamp ASC
            `, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as MemberStats[]);
            });
        });
    }

    public async getGameStatsHistory(hours: number = 24): Promise<GameStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        const allAsync = promisify(this.db.all.bind(this.db));
        
        const rows = await allAsync(`
            SELECT timestamp, game_name, player_count
            FROM game_stats
            WHERE timestamp >= datetime('now', '-${hours} hours')
            ORDER BY timestamp ASC, game_name ASC
        `) as GameStats[];

        return rows;
    }

    public async getTopGames(hours: number = 24, limit: number = 10): Promise<{game_name: string, total_playtime_minutes: number, unique_players: number}[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            // First try to get data from game_sessions (real-time tracking)
            this.db!.all(`
                SELECT 
                    game_name,
                    SUM(COALESCE(duration_minutes, 0)) as total_playtime_minutes,
                    COUNT(DISTINCT user_id) as unique_players
                FROM game_sessions
                WHERE start_time >= datetime('now', '-${hours} hours')
                GROUP BY game_name
                HAVING total_playtime_minutes > 0
                ORDER BY total_playtime_minutes DESC
                LIMIT ?
            `, [limit], (err, sessionRows) => {
                if (err) {
                    reject(err);
                    return;
                }

                // If we have good session data, use it
                if (sessionRows && sessionRows.length > 0 && sessionRows.some((row: any) => row.total_playtime_minutes > 0)) {
                    resolve(sessionRows as {game_name: string, total_playtime_minutes: number, unique_players: number}[]);
                    return;
                }

                // Fallback: Calculate from game_stats (periodic collection data)
                this.db!.all(`
                    SELECT 
                        game_name,
                        -- Estimate playtime based on frequency of appearances in stats
                        -- Each stats entry represents ~2 minutes of activity
                        COUNT(*) * 2 as total_playtime_minutes,
                        -- Estimate unique players as max player count seen
                        MAX(player_count) as unique_players
                    FROM game_stats
                    WHERE timestamp >= datetime('now', '-${hours} hours')
                      AND player_count > 0
                    GROUP BY game_name
                    ORDER BY total_playtime_minutes DESC
                    LIMIT ?
                `, [limit], (err2, statsRows) => {
                    if (err2) reject(err2);
                    else resolve(statsRows as {game_name: string, total_playtime_minutes: number, unique_players: number}[]);
                });
            });
        });
    }

    public async getTopGamesByDateRange(startDate: string, endDate: string, limit: number = 10): Promise<{game_name: string, total_playtime_minutes: number, unique_players: number}[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            // First try to get data from game_sessions (real-time tracking)
            this.db!.all(`
                SELECT 
                    game_name,
                    SUM(COALESCE(duration_minutes, 0)) as total_playtime_minutes,
                    COUNT(DISTINCT user_id) as unique_players
                FROM game_sessions
                WHERE start_time >= ? AND start_time <= ?
                GROUP BY game_name
                HAVING total_playtime_minutes > 0
                ORDER BY total_playtime_minutes DESC
                LIMIT ?
            `, [startDate, endDate, limit], (err, sessionRows) => {
                if (err) {
                    reject(err);
                    return;
                }

                // If we have good session data, use it
                if (sessionRows && sessionRows.length > 0 && sessionRows.some((row: any) => row.total_playtime_minutes > 0)) {
                    resolve(sessionRows as {game_name: string, total_playtime_minutes: number, unique_players: number}[]);
                    return;
                }

                // Fallback: Calculate from game_stats (periodic collection data)
                this.db!.all(`
                    SELECT 
                        game_name,
                        -- Estimate playtime based on frequency of appearances in stats
                        -- Each stats entry represents ~2 minutes of activity
                        COUNT(*) * 2 as total_playtime_minutes,
                        -- Estimate unique players as max player count seen
                        MAX(player_count) as unique_players
                    FROM game_stats
                    WHERE timestamp >= ? AND timestamp <= ?
                      AND player_count > 0
                    GROUP BY game_name
                    ORDER BY total_playtime_minutes DESC
                    LIMIT ?
                `, [startDate, endDate, limit], (err2, statsRows) => {
                    if (err2) reject(err2);
                    else resolve(statsRows as {game_name: string, total_playtime_minutes: number, unique_players: number}[]);
                });
            });
        });
    }

    public async getRecentGameActivity(limit: number = 20): Promise<{
        user_id: string,
        game_name: string,
        action: 'started' | 'stopped',
        timestamp: string,
        session_duration?: number
    }[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT 
                    user_id,
                    game_name,
                    CASE 
                        WHEN end_time IS NULL THEN 'started'
                        ELSE 'stopped'
                    END as action,
                    CASE 
                        WHEN end_time IS NULL THEN start_time
                        ELSE end_time
                    END as timestamp,
                    duration_minutes as session_duration
                FROM game_sessions
                WHERE start_time >= datetime('now', '-24 hours')
                ORDER BY 
                    CASE 
                        WHEN end_time IS NULL THEN start_time
                        ELSE end_time
                    END DESC
                LIMIT ?
            `, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as {
                    user_id: string,
                    game_name: string,
                    action: 'started' | 'stopped',
                    timestamp: string,
                    session_duration?: number
                }[]);
            });
        });
    }

    public async getCurrentStats(): Promise<{memberStats: MemberStats | null, currentGames: {game_name: string, player_count: number}[]}> {
        if (!this.db) throw new Error('Database not initialized');

        const getAsync = promisify(this.db.get.bind(this.db));
        const allAsync = promisify(this.db.all.bind(this.db));

        // Get latest member stats
        const memberStats = await getAsync(`
            SELECT timestamp, total_members, online_members
            FROM member_stats
            ORDER BY timestamp DESC
            LIMIT 1
        `) as MemberStats | null;

        // Get current games from active sessions (real-time) - fallback to recent game stats if no sessions
        let currentGames = await allAsync(`
            SELECT game_name, 
                   COUNT(DISTINCT user_id) as player_count
            FROM game_sessions
            WHERE end_time IS NULL
            GROUP BY game_name
            HAVING player_count > 0
            ORDER BY player_count DESC
        `) as {game_name: string, player_count: number}[];
        
        // If no active sessions found, fallback to most recent game stats (within last 1 minute)
        if (currentGames.length === 0) {
            currentGames = await allAsync(`
                SELECT game_name, player_count
                FROM game_stats
                WHERE timestamp >= datetime('now', '-1 minute')
                AND player_count > 0
                ORDER BY timestamp DESC, player_count DESC
            `) as {game_name: string, player_count: number}[];
            
            // Remove duplicates, keeping the most recent entry for each game
            const gameMap = new Map();
            currentGames.forEach(game => {
                if (!gameMap.has(game.game_name)) {
                    gameMap.set(game.game_name, game);
                }
            });
            currentGames = Array.from(gameMap.values());
        }

        return { memberStats, currentGames };
    }

    public async cleanupStaleGameSessions(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        // End sessions that have been active for more than 8 hours (likely stale)
        return new Promise((resolve, reject) => {
            this.db!.run(`
                UPDATE game_sessions 
                SET end_time = CURRENT_TIMESTAMP,
                    duration_minutes = ROUND((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(start_time)) * 24 * 60)
                WHERE end_time IS NULL 
                AND start_time < datetime('now', '-8 hours')
            `, (err) => {
                if (err) reject(err);
                else {
                    console.log('🧹 Cleaned up stale game sessions');
                    resolve();
                }
            });
        });
    }

    public async close(): Promise<void> {
        if (this.db) {
            const closeAsync = promisify(this.db.close.bind(this.db));
            await closeAsync();
            this.db = null;
            console.log('✅ Database connection closed');
        }
    }

    public async getActiveSessions(): Promise<{user_id: string, game_name: string, start_time: string}[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT user_id, game_name, start_time
                FROM game_sessions
                WHERE end_time IS NULL
                AND start_time >= datetime('now', '-8 hours')
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows as {user_id: string, game_name: string, start_time: string}[]);
            });
        });
    }
}
