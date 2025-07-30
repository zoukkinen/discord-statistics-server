import { DatabaseFactory, DatabaseAdapter } from './database/';

// Type definitions
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
    private adapter: DatabaseAdapter;

    constructor() {
        this.adapter = DatabaseFactory.createAdapter();
    }

    public async initialize(): Promise<void> {
        return this.adapter.initialize();
    }

    public async recordMemberCount(totalMembers: number, onlineMembers: number): Promise<void> {
        return this.adapter.recordMemberCount(totalMembers, onlineMembers);
    }

    public async recordGameActivity(gameName: string, playerCount: number): Promise<void> {
        return this.adapter.recordGameActivity(gameName, playerCount);
    }

    public async recordGameSession(userId: string, gameName: string, action: 'start' | 'end'): Promise<void> {
        return this.adapter.recordGameSession(userId, gameName, action);
    }

    public async getMemberStatsInRange(startDate: string, endDate: string): Promise<MemberStats[]> {
        return this.adapter.getMemberStatsInRange(startDate, endDate);
    }

    public async getGameStatsInRange(startDate: string, endDate: string): Promise<GameStats[]> {
        return this.adapter.getGameStatsInRange(startDate, endDate);
    }

    public async getGameSessionsInRange(startDate: string, endDate: string): Promise<GameSession[]> {
        return this.adapter.getGameSessionsInRange(startDate, endDate);
    }

    public async getTopGamesInRange(startDate: string, endDate: string, limit?: number): Promise<{game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number}[]> {
        return this.adapter.getTopGamesInRange(startDate, endDate, limit);
    }

    public async getUserActivity(startDate: string, endDate: string): Promise<{
        user_id: string,
        game_name: string,
        action: 'started' | 'stopped',
        timestamp: string,
        session_duration?: number
    }[]> {
        return this.adapter.getUserActivity(startDate, endDate);
    }

    public async getCurrentStats(): Promise<{memberStats: MemberStats | null, currentGames: {game_name: string, player_count: number}[]}> {
        return this.adapter.getCurrentStats();
    }

    public async cleanupStaleGameSessions(): Promise<void> {
        return this.adapter.cleanupStaleGameSessions();
    }

    public async getActiveSessions(): Promise<{user_id: string, game_name: string, start_time: string}[]> {
        return this.adapter.getActiveSessions();
    }

    public async close(): Promise<void> {
        return this.adapter.close();
    }
}
