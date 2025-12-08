// Integration tests for PostgreSQL database operations
import { PostgreSQLAdapter } from "../../src/database/PostgreSQLAdapter";

describe("PostgreSQLAdapter Integration Tests", () => {
  let adapter: PostgreSQLAdapter;
  const testGuildId = "test-guild-123456789";

  beforeAll(async () => {
    adapter = new PostgreSQLAdapter(testGuildId);
    await adapter.initialize();
  }, 30000);

  afterAll(async () => {
    await adapter.cleanup();
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    try {
      await adapter.query(
        "DELETE FROM member_stats WHERE event_id IN (SELECT id FROM events WHERE guild_id = $1)",
        [testGuildId]
      );
      await adapter.query(
        "DELETE FROM game_stats WHERE event_id IN (SELECT id FROM events WHERE guild_id = $1)",
        [testGuildId]
      );
      await adapter.query(
        "DELETE FROM game_sessions WHERE event_id IN (SELECT id FROM events WHERE guild_id = $1)",
        [testGuildId]
      );
      await adapter.query("DELETE FROM events WHERE guild_id = $1", [
        testGuildId,
      ]);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Event Management", () => {
    it("should create a new event successfully", async () => {
      const eventData = {
        name: "Test Event 2025",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Integration test event",
        guildId: testGuildId,
        isActive: true,
      };

      const createdEvent = await adapter.createEvent(eventData);

      expect(createdEvent).toBeDefined();
      expect(createdEvent.id).toBeDefined();
      expect(createdEvent.name).toBe(eventData.name);
      expect(createdEvent.guild_id || createdEvent.guildId).toBe(testGuildId);
      expect(createdEvent.is_active || createdEvent.isActive).toBe(true);
    });

    it("should create event with Discord credentials", async () => {
      const eventData = {
        name: "Test Event with Discord",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Test event with Discord credentials",
        guildId: testGuildId,
        discordToken:
          "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.some-test-token-for-integration-testing-purposes-only",
        discordGuildId: "1234567890123456789",
        isActive: true,
      };

      const createdEvent = await adapter.createEvent(eventData);

      expect(createdEvent).toBeDefined();
      expect(createdEvent.discordToken).toBe(eventData.discordToken);
      expect(createdEvent.discordGuildId).toBe(eventData.discordGuildId);
    });

    it("should retrieve events for a guild", async () => {
      // Create test events
      await adapter.createEvent({
        name: "Test Event 1",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "First test event",
        guildId: testGuildId,
        isActive: true,
      });

      await adapter.createEvent({
        name: "Test Event 2",
        startDate: "2025-02-01T00:00:00Z",
        endDate: "2025-02-02T00:00:00Z",
        timezone: "UTC",
        description: "Second test event",
        guildId: testGuildId,
        isActive: false,
      });

      const events = await adapter.getEvents(testGuildId);

      expect(events).toHaveLength(2);
      expect(events[0].name).toBe("Test Event 2"); // Should be ordered by created_at DESC
      expect(events[1].name).toBe("Test Event 1");
    });

    it("should get active event for guild", async () => {
      const eventData = {
        name: "Active Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Active test event",
        guildId: testGuildId,
        isActive: true,
      };

      await adapter.createEvent(eventData);
      const activeEvent = await adapter.getActiveEvent(testGuildId);

      expect(activeEvent).toBeDefined();
      expect(activeEvent.name).toBe(eventData.name);
      expect(activeEvent.is_active || activeEvent.isActive).toBe(true);
    });

    it("should set active event", async () => {
      // Create two events
      const event1 = await adapter.createEvent({
        name: "Event 1",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "First event",
        guildId: testGuildId,
        isActive: true,
      });

      const event2 = await adapter.createEvent({
        name: "Event 2",
        startDate: "2025-02-01T00:00:00Z",
        endDate: "2025-02-02T00:00:00Z",
        timezone: "UTC",
        description: "Second event",
        guildId: testGuildId,
        isActive: false,
      });

      // Set event2 as active
      await adapter.setActiveEvent(testGuildId, event2.id);

      const activeEvent = await adapter.getActiveEvent(testGuildId);
      expect(activeEvent.id).toBe(event2.id);

      // Verify event1 is no longer active
      const event1Updated = await adapter.getEvent(event1.id);
      expect(event1Updated.is_active || event1Updated.isActive).toBe(false);
    });
  });

  describe("Data Recording", () => {
    let testEventId: number;

    beforeEach(async () => {
      const event = await adapter.createEvent({
        name: "Data Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Event for data testing",
        guildId: testGuildId,
        isActive: true,
      });
      testEventId = event.id;
    });

    it("should record member count successfully", async () => {
      await adapter.recordMemberCount(100, 75, testEventId);

      const stats = await adapter.getCurrentStats(testEventId);
      expect(stats.memberStats).toBeDefined();
      expect(stats.memberStats!.total_members).toBe(100);
      expect(stats.memberStats!.online_members).toBe(75);
    });

    it("should record game activity", async () => {
      await adapter.recordGameActivity("Test Game", 10, testEventId);

      const currentStats = await adapter.getCurrentStats(testEventId);
      expect(currentStats.currentGames).toHaveLength(1);
      expect(currentStats.currentGames[0].game_name).toBe("Test Game");
      expect(currentStats.currentGames[0].player_count).toBe(10);
    });

    it("should record game sessions", async () => {
      const userId = "test-user-123";
      const gameName = "Test Game";

      // Start a game session
      await adapter.recordGameSession(userId, gameName, "start", testEventId);

      let activeSessions = await adapter.getActiveSessions(testEventId);
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].user_id).toBe(userId);
      expect(activeSessions[0].game_name).toBe(gameName);

      // End the game session
      await adapter.recordGameSession(userId, gameName, "end", testEventId);

      activeSessions = await adapter.getActiveSessions(testEventId);
      expect(activeSessions).toHaveLength(0);
    });

    it("should handle multiple game sessions for same user", async () => {
      const userId = "test-user-123";

      await adapter.recordGameSession(userId, "Game 1", "start", testEventId);
      await adapter.recordGameSession(userId, "Game 2", "start", testEventId);

      const activeSessions = await adapter.getActiveSessions(testEventId);
      expect(activeSessions).toHaveLength(2);

      // End one session
      await adapter.recordGameSession(userId, "Game 1", "end", testEventId);

      const remainingSessions = await adapter.getActiveSessions(testEventId);
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].game_name).toBe("Game 2");
    });
  });

  describe("Data Retrieval", () => {
    let testEventId: number;

    beforeEach(async () => {
      // Create event with date range that covers NOW (since test data is recorded with current timestamps)
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const event = await adapter.createEvent({
        name: "Retrieval Test Event",
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString(),
        timezone: "UTC",
        description: "Event for retrieval testing",
        guildId: testGuildId,
        isActive: true,
      });
      testEventId = event.id;

      // Add some test data
      await adapter.recordMemberCount(100, 75, testEventId);
      await adapter.recordMemberCount(110, 80, testEventId);
      await adapter.recordGameActivity("Game A", 15, testEventId);
      await adapter.recordGameActivity("Game B", 25, testEventId);
      // Record more activities to ensure game_stats gets populated
      await adapter.recordGameActivity("Game A", 12, testEventId);
      await adapter.recordGameActivity("Game B", 18, testEventId);

      // Record game sessions for statistics (required for getEventStats to count unique games)
      await adapter.recordGameSession("user-1", "Game A", "start", testEventId);
      await adapter.recordGameSession("user-1", "Game A", "end", testEventId);
      await adapter.recordGameSession("user-2", "Game B", "start", testEventId);
      await adapter.recordGameSession("user-2", "Game B", "end", testEventId);
    });

    it("should get member stats in date range", async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
      const endDate = new Date().toISOString();

      const memberStats = await adapter.getMemberStatsInRange(
        startDate,
        endDate,
        testEventId
      );

      expect(memberStats.length).toBeGreaterThanOrEqual(2);
      expect(memberStats[0].event_id).toBe(testEventId);
    });

    it("should get game stats in date range", async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();

      const gameStats = await adapter.getGameStatsInRange(
        startDate,
        endDate,
        testEventId
      );

      expect(gameStats.length).toBeGreaterThanOrEqual(2);
      expect(gameStats.some((stat) => stat.game_name === "Game A")).toBe(true);
      expect(gameStats.some((stat) => stat.game_name === "Game B")).toBe(true);
    });

    it("should get event statistics", async () => {
      const stats = await adapter.getEventStats(testEventId);

      expect(stats).toBeDefined();
      expect(stats.eventId).toBe(testEventId);
      expect(stats.totalUniqueGames).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Backward Compatibility", () => {
    it("should work without explicit event ID (using active event)", async () => {
      // Create and set active event
      const event = await adapter.createEvent({
        name: "Default Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Default event for backward compatibility",
        guildId: testGuildId,
        isActive: true,
      });

      // These methods should work without eventId parameter
      await adapter.recordMemberCount(100, 75);
      await adapter.recordGameActivity("Default Game", 10);

      const stats = await adapter.getCurrentStats();
      expect(stats.memberStats).toBeDefined();
      expect(stats.currentGames).toHaveLength(1);
    });
  });
});
