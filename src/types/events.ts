export interface Event {
    id?: number;
    name: string;
    startDate: string;
    endDate: string;
    timezone: string;
    description: string;
    guildId: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface EventStats {
    eventId: number;
    eventName: string;
    totalUniqueGames: number;
    totalGameSessions: number;
    peakOnlineMembers: number;
    averageOnlineMembers: number;
    totalActiveHours: number;
    topGame: {
        name: string;
        totalPlayers: number;
        peakPlayers: number;
    } | null;
}

export interface EventSummary {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    status: 'upcoming' | 'active' | 'completed';
    basicStats?: {
        totalSessions: number;
        uniqueGames: number;
        peakMembers: number;
    };
}

/**
 * Extended EventConfig interface that includes database-stored events
 */
export interface ExtendedEventConfig extends Event {
    // Helper methods for compatibility with existing Config class
    getDateRange(): { start: string; end: string };
    isEventActive(): boolean;
    hasEventStarted(): boolean;
    getStatus(): 'upcoming' | 'active' | 'completed';
}

export class EventManager {
    /**
     * Get the current active event configuration
     * Falls back to environment variables if no database event is active
     */
    static async getCurrentEvent(): Promise<ExtendedEventConfig> {
        // This will be implemented to check database first,
        // then fall back to environment variables
        throw new Error('Not implemented - requires database integration');
    }

    /**
     * Create a new event from environment variables (migration helper)
     */
    static createFromEnvironment(guildId: string): Omit<Event, 'id' | 'createdAt' | 'updatedAt'> {
        return {
            name: process.env.EVENT_NAME || 'Assembly Summer 2025',
            startDate: process.env.EVENT_START_DATE || '2025-07-31T07:00:00Z',
            endDate: process.env.EVENT_END_DATE || '2025-08-03T13:00:00Z',
            timezone: process.env.EVENT_TIMEZONE || 'Europe/Helsinki',
            description: process.env.EVENT_DESCRIPTION || 'Discord activity tracking for Assembly Summer 2025',
            guildId: guildId,
            isActive: true
        };
    }

    /**
     * Helper to determine event status
     */
    static getEventStatus(startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (now < start) return 'upcoming';
        if (now >= start && now <= end) return 'active';
        return 'completed';
    }

    /**
     * Helper to check if event is currently active
     */
    static isEventCurrentlyActive(startDate: string, endDate: string): boolean {
        return this.getEventStatus(startDate, endDate) === 'active';
    }
}
