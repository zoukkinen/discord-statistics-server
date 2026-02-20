import { DatabaseFactory, DatabaseAdapter } from "./database/";
import { Event, EventStats, EventSummary } from "./types/events";

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
  game_name_alias?: string | null;
  is_removed: boolean;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
}

export class Database {
  private adapter: DatabaseAdapter;

  constructor(guildId?: string) {
    this.adapter = DatabaseFactory.createAdapter(guildId);
  }

  public async initialize(): Promise<void> {
    return this.adapter.initialize();
  }

  public async recordMemberCount(
    totalMembers: number,
    onlineMembers: number,
    eventId?: number,
  ): Promise<void> {
    return this.adapter.recordMemberCount(totalMembers, onlineMembers, eventId);
  }

  public async recordGameActivity(
    gameName: string,
    playerCount: number,
    eventId?: number,
  ): Promise<void> {
    return this.adapter.recordGameActivity(gameName, playerCount, eventId);
  }

  public async recordGameSession(
    userId: string,
    gameName: string,
    action: "start" | "end",
    eventId?: number,
  ): Promise<void> {
    return this.adapter.recordGameSession(userId, gameName, action, eventId);
  }

  public async getMemberStatsInRange(
    startDate: string,
    endDate: string,
    eventId?: number,
  ): Promise<MemberStats[]> {
    return this.adapter.getMemberStatsInRange(startDate, endDate, eventId);
  }

  public async getGameStatsInRange(
    startDate: string,
    endDate: string,
    eventId?: number,
  ): Promise<GameStats[]> {
    return this.adapter.getGameStatsInRange(startDate, endDate, eventId);
  }

  public async getGameSessionsInRange(
    startDate: string,
    endDate: string,
    eventId?: number,
  ): Promise<GameSession[]> {
    return this.adapter.getGameSessionsInRange(startDate, endDate, eventId);
  }

  public async getTopGamesInRange(
    startDate: string,
    endDate: string,
    limit?: number,
    eventId?: number,
  ): Promise<
    {
      game_name: string;
      total_sessions: number;
      total_minutes: number;
      avg_minutes: number;
    }[]
  > {
    return this.adapter.getTopGamesInRange(startDate, endDate, limit, eventId);
  }

  public async getUserActivity(
    startDate: string,
    endDate: string,
    eventId?: number,
  ): Promise<
    {
      user_id: string;
      game_name: string;
      action: "started" | "stopped";
      timestamp: string;
      session_duration?: number;
    }[]
  > {
    return this.adapter.getUserActivity(startDate, endDate, eventId);
  }

  public async getCurrentStats(eventId?: number): Promise<{
    memberStats: MemberStats | null;
    currentGames: { game_name: string; player_count: number }[];
  }> {
    return this.adapter.getCurrentStats(eventId);
  }

  public async cleanupStaleGameSessions(): Promise<void> {
    return this.adapter.cleanupStaleGameSessions();
  }

  public async getActiveSessions(
    eventId?: number,
  ): Promise<{ user_id: string; game_name: string; start_time: string }[]> {
    return this.adapter.getActiveSessions(eventId);
  }

  public async close(): Promise<void> {
    return this.adapter.close();
  }

  // Event management methods
  public async createEvent(
    event: Omit<Event, "id" | "createdAt" | "updatedAt">,
  ): Promise<Event> {
    return this.adapter.createEvent(event);
  }

  public async getEvents(guildId: string): Promise<Event[]> {
    return this.adapter.getEvents(guildId);
  }

  public async getActiveEvent(guildId: string): Promise<Event | null> {
    return this.adapter.getActiveEvent(guildId);
  }

  public async updateEvent(
    id: number,
    updates: Partial<Event>,
  ): Promise<Event> {
    return this.adapter.updateEvent(id, updates);
  }

  public async deleteEvent(eventId: number): Promise<boolean> {
    return this.adapter.deleteEvent(eventId);
  }

  public async setActiveEvent(guildId: string, eventId: number): Promise<void> {
    return this.adapter.setActiveEvent(guildId, eventId);
  }

  public async getEventStats(eventId: number): Promise<EventStats> {
    return this.adapter.getEventStats(eventId);
  }

  public async getEventSummaries(guildId: string): Promise<EventSummary[]> {
    return this.adapter.getEventSummaries(guildId);
  }

  public async getEvent(eventId: number): Promise<Event | null> {
    // Get a single event by ID - we'll need to implement this in the adapter
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return null;

    const events = await this.adapter.getEvents(guildId);
    return events.find((event) => event.id === eventId) || null;
  }

  public async getEventSessions(eventId: number): Promise<GameSession[]> {
    return this.adapter.getEventSessions(eventId);
  }

  public async bulkRenameGame(
    eventId: number,
    oldName: string,
    newName: string,
  ): Promise<number> {
    return this.adapter.bulkRenameGame(eventId, oldName, newName);
  }

  public async toggleSessionRemoved(
    sessionId: number,
    isRemoved: boolean,
  ): Promise<GameSession> {
    return this.adapter.toggleSessionRemoved(sessionId, isRemoved);
  }

  public async cleanup(): Promise<void> {
    if (this.adapter && typeof (this.adapter as any).cleanup === "function") {
      await (this.adapter as any).cleanup();
    }
  }
}
