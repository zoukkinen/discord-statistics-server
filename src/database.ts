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
            this.db!.all(`
                SELECT 
                    game_name,
                    SUM(COALESCE(duration_minutes, 0)) as total_playtime_minutes,
                    COUNT(DISTINCT user_id) as unique_players
                FROM game_sessions
                WHERE start_time >= datetime('now', '-${hours} hours')
                GROUP BY game_name
                ORDER BY total_playtime_minutes DESC
                LIMIT ?
            `, [limit], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as {game_name: string, total_playtime_minutes: number, unique_players: number}[]);
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

        // Get current games (latest entry for each game in last 10 minutes)
        const currentGames = await allAsync(`
            SELECT DISTINCT game_name, 
                   (SELECT player_count FROM game_stats gs2 
                    WHERE gs2.game_name = gs1.game_name 
                    ORDER BY timestamp DESC LIMIT 1) as player_count
            FROM game_stats gs1
            WHERE timestamp >= datetime('now', '-10 minutes')
            AND player_count > 0
            ORDER BY player_count DESC
        `) as {game_name: string, player_count: number}[];

        return { memberStats, currentGames };
    }

    public async close(): Promise<void> {
        if (this.db) {
            const closeAsync = promisify(this.db.close.bind(this.db));
            await closeAsync();
            this.db = null;
            console.log('✅ Database connection closed');
        }
    }
}
