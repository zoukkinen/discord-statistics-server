import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseAdapter, MemberStats, GameStats, GameSession } from './types';

export class SQLiteAdapter implements DatabaseAdapter {
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
            console.log('✅ SQLite database initialized successfully');
        } catch (error) {
            console.error('❌ SQLite database initialization failed:', error);
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
                    duration_minutes = ROUND((JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(start_time)) * 24 * 60)
                WHERE user_id = ? AND game_name = ? AND end_time IS NULL
            `, [userId, gameName], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public async getMemberStatsInRange(startDate: string, endDate: string): Promise<MemberStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT timestamp, total_members, online_members
                FROM member_stats
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp ASC
            `, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as MemberStats[]);
            });
        });
    }

    public async getGameStatsInRange(startDate: string, endDate: string): Promise<GameStats[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT timestamp, game_name, player_count
                FROM game_stats
                WHERE timestamp BETWEEN ? AND ?
                ORDER BY timestamp ASC
            `, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as GameStats[]);
            });
        });
    }

    public async getGameSessionsInRange(startDate: string, endDate: string): Promise<GameSession[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT id, user_id, game_name, start_time, end_time, duration_minutes
                FROM game_sessions
                WHERE start_time BETWEEN ? AND ?
                ORDER BY start_time ASC
            `, [startDate, endDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as GameSession[]);
            });
        });
    }

    public async getTopGamesInRange(startDate: string, endDate: string, limit: number = 10): Promise<{game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number, unique_players: number}[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            this.db!.all(`
                SELECT 
                    game_name,
                    COUNT(*) as total_sessions,
                    COALESCE(SUM(
                        CASE 
                            WHEN duration_minutes IS NOT NULL THEN duration_minutes
                            WHEN end_time IS NULL THEN ROUND((JULIANDAY('now') - JULIANDAY(start_time)) * 24 * 60)
                            ELSE 0
                        END
                    ), 0) as total_minutes,
                    COALESCE(AVG(
                        CASE 
                            WHEN duration_minutes IS NOT NULL THEN duration_minutes
                            WHEN end_time IS NULL THEN ROUND((JULIANDAY('now') - JULIANDAY(start_time)) * 24 * 60)
                            ELSE 0
                        END
                    ), 0) as avg_minutes,
                    COUNT(DISTINCT user_id) as unique_players
                FROM game_sessions
                WHERE start_time BETWEEN ? AND ?
                GROUP BY game_name
                ORDER BY total_sessions DESC, total_minutes DESC
                LIMIT ?
            `, [startDate, endDate, limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as {game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number, unique_players: number}[]);
            });
        });
    }

    public async getUserActivity(startDate: string, endDate: string): Promise<{
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
                    start_time as timestamp,
                    'started' as action,
                    NULL as session_duration
                FROM game_sessions
                WHERE start_time BETWEEN ? AND ?
                
                UNION ALL
                
                SELECT 
                    user_id,
                    game_name,
                    end_time as timestamp,
                    'stopped' as action,
                    duration_minutes as session_duration
                FROM game_sessions
                WHERE end_time BETWEEN ? AND ?
                AND end_time IS NOT NULL
                
                ORDER BY timestamp ASC
            `, [startDate, endDate, startDate, endDate], (err, rows) => {
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

    public async close(): Promise<void> {
        if (this.db) {
            const closeAsync = promisify(this.db.close.bind(this.db));
            await closeAsync();
            this.db = null;
            console.log('✅ SQLite database connection closed');
        }
    }
}
