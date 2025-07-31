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

export interface DatabaseAdapter {
    initialize(): Promise<void>;
    close(): Promise<void>;
    
    // Member statistics
    recordMemberCount(totalMembers: number, onlineMembers: number): Promise<void>;
    getMemberStatsInRange(startDate: string, endDate: string): Promise<MemberStats[]>;
    
    // Game statistics
    recordGameActivity(gameName: string, playerCount: number): Promise<void>;
    getGameStatsInRange(startDate: string, endDate: string): Promise<GameStats[]>;
    getTopGamesInRange(startDate: string, endDate: string, limit?: number): Promise<{game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number, unique_players: number}[]>;
    
    // Game sessions
    recordGameSession(userId: string, gameName: string, action: 'start' | 'end'): Promise<void>;
    getGameSessionsInRange(startDate: string, endDate: string): Promise<GameSession[]>;
    getActiveSessions(): Promise<{user_id: string, game_name: string, start_time: string}[]>;
    cleanupStaleGameSessions(): Promise<void>;
    
    // Current stats
    getCurrentStats(): Promise<{memberStats: MemberStats | null, currentGames: {game_name: string, player_count: number}[]}>;
    
    // User activity
    getUserActivity(startDate: string, endDate: string): Promise<{
        user_id: string,
        game_name: string,
        action: 'started' | 'stopped',
        timestamp: string,
        session_duration?: number
    }[]>;
}
