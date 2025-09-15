import { Event, EventStats, EventSummary } from '../types/events';

export interface MemberStats {
    timestamp: string;
    total_members: number;
    online_members: number;
    event_id?: number;
}

export interface GameStats {
    timestamp: string;
    game_name: string;
    player_count: number;
    event_id?: number;
}

export interface GameSession {
    id: number;
    user_id: string;
    game_name: string;
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
    event_id?: number;
}

export interface DatabaseAdapter {
    initialize(): Promise<void>;
    close(): Promise<void>;
    
    // Event management
    createEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event>;
    getEvent(id: number): Promise<Event | null>;
    getEvents(guildId: string): Promise<Event[]>;
    getActiveEvent(guildId: string): Promise<Event | null>;
    updateEvent(id: number, updates: Partial<Event>): Promise<Event>;
    setActiveEvent(guildId: string, eventId: number): Promise<void>;
    getEventStats(eventId: number): Promise<EventStats>;
    getEventSummaries(guildId: string): Promise<EventSummary[]>;
    
    // Member statistics (event-aware)
    recordMemberCount(totalMembers: number, onlineMembers: number, eventId?: number): Promise<void>;
    getMemberStatsInRange(startDate: string, endDate: string, eventId?: number): Promise<MemberStats[]>;
    
    // Game statistics (event-aware)
    recordGameActivity(gameName: string, playerCount: number, eventId?: number): Promise<void>;
    getGameStatsInRange(startDate: string, endDate: string, eventId?: number): Promise<GameStats[]>;
    getTopGamesInRange(startDate: string, endDate: string, limit?: number, eventId?: number): Promise<{game_name: string, total_sessions: number, total_minutes: number, avg_minutes: number, unique_players: number}[]>;
    
    // Game sessions (event-aware)
    recordGameSession(userId: string, gameName: string, action: 'start' | 'end', eventId?: number): Promise<void>;
    getGameSessionsInRange(startDate: string, endDate: string, eventId?: number): Promise<GameSession[]>;
    getActiveSessions(eventId?: number): Promise<{user_id: string, game_name: string, start_time: string}[]>;
    cleanupStaleGameSessions(): Promise<void>;
    
    // Current stats (event-aware)
    getCurrentStats(eventId?: number): Promise<{memberStats: MemberStats | null, currentGames: {game_name: string, player_count: number}[]}>;
    
    // User activity (event-aware)
    getUserActivity(startDate: string, endDate: string, eventId?: number): Promise<{
        user_id: string,
        game_name: string,
        action: 'started' | 'stopped',
        timestamp: string,
        session_duration?: number
    }[]>;
}
