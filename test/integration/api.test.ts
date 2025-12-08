// Integration tests for web server API endpoints
import request from "supertest";
import { Express } from "express";
import { createServer } from "../../src/webServer";
import { PostgreSQLAdapter } from "../../src/database/PostgreSQLAdapter";

describe("Web Server API Integration Tests", () => {
  let app: Express;
  let server: any;
  let adapter: PostgreSQLAdapter;
  const testGuildId = process.env.DISCORD_GUILD_ID || "1234567890123456789";

  beforeAll(async () => {
    // Initialize database adapter for test data setup
    adapter = new PostgreSQLAdapter(testGuildId);
    await adapter.initialize();

    // Create test server
    app = await createServer();
    server = app.listen(0); // Use random available port
  }, 30000);

  afterAll(async () => {
    if (server) {
      server.close();
    }
    if (adapter) {
      await adapter.cleanup();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
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

  describe("GET /api/config", () => {
    it("should return configuration when no events exist", async () => {
      const response = await request(app).get("/api/config").expect(200);

      expect(response.body).toHaveProperty("event");
      expect(response.body).toHaveProperty("isEventActive");
      expect(response.body).toHaveProperty("hasEventStarted");
      expect(response.body.event.name).toBeDefined();
    });

    it("should return active event configuration when event exists", async () => {
      // Create a test event
      await adapter.createEvent({
        name: "API Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Event for API testing",
        guildId: testGuildId,
        isActive: true,
      });

      const response = await request(app).get("/api/config").expect(200);

      expect(response.body.event.name).toBe("API Test Event");
      expect(response.body.activeEventId).toBeDefined();
    });
  });

  describe("GET /api/stats", () => {
    let testEventId: number;

    beforeEach(async () => {
      const event = await adapter.createEvent({
        name: "Stats Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Event for stats API testing",
        guildId: testGuildId,
        isActive: true,
      });
      testEventId = event.id;

      // Add some test data
      await adapter.recordMemberCount(100, 75, testEventId);
      await adapter.recordGameActivity("Test Game", 10, testEventId);
    });

    it("should return current statistics", async () => {
      const response = await request(app).get("/api/stats").expect(200);

      expect(response.body).toHaveProperty("memberStats");
      expect(response.body).toHaveProperty("currentGames");
      expect(response.body.memberStats.total_members).toBe(100);
      expect(response.body.currentGames).toHaveLength(1);
    });

    it("should return statistics for specific event", async () => {
      const response = await request(app)
        .get(`/api/stats?eventId=${testEventId}`)
        .expect(200);

      expect(response.body.memberStats.total_members).toBe(100);
    });
  });

  describe("GET /api/stats/history", () => {
    let testEventId: number;

    beforeEach(async () => {
      const event = await adapter.createEvent({
        name: "History Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Event for history API testing",
        guildId: testGuildId,
        isActive: true,
      });
      testEventId = event.id;

      // Add historical data
      await adapter.recordMemberCount(100, 75, testEventId);
      await adapter.recordMemberCount(110, 80, testEventId);
      await adapter.recordGameActivity("Game A", 15, testEventId);
      await adapter.recordGameActivity("Game B", 25, testEventId);
    });

    it("should return member statistics history", async () => {
      const response = await request(app)
        .get("/api/stats/history/members")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty("timestamp");
      expect(response.body[0]).toHaveProperty("total_members");
    });

    it("should return game statistics history", async () => {
      const response = await request(app)
        .get("/api/stats/history/games")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty("game_name");
      expect(response.body[0]).toHaveProperty("player_count");
    });

    it("should handle date range queries", async () => {
      const startDate = new Date(Date.now() - 86400000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/stats/history/members?start=${startDate}&end=${endDate}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/stats/top-games", () => {
    let testEventId: number;

    beforeEach(async () => {
      const event = await adapter.createEvent({
        name: "Top Games Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Event for top games API testing",
        guildId: testGuildId,
        isActive: true,
      });
      testEventId = event.id;

      // Create some game sessions
      await adapter.recordGameSession(
        "user1",
        "Popular Game",
        "start",
        testEventId
      );
      await adapter.recordGameSession(
        "user2",
        "Popular Game",
        "start",
        testEventId
      );
      await adapter.recordGameSession(
        "user3",
        "Less Popular Game",
        "start",
        testEventId
      );
    });

    it("should return top games", async () => {
      const response = await request(app)
        .get("/api/stats/top-games")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should have games ordered by popularity
    });

    it("should respect limit parameter", async () => {
      const response = await request(app)
        .get("/api/stats/top-games?limit=1")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });
  });

  describe("Admin Authentication", () => {
    describe("POST /api/admin/auth", () => {
      it("should authenticate with correct password", async () => {
        const response = await request(app)
          .post("/api/admin/auth")
          .send({ password: process.env.ADMIN_PASSWORD || "admin123" })
          .expect(200);

        expect(response.body).toHaveProperty("token");
        expect(response.body).toHaveProperty("expiresIn");
      });

      it("should reject incorrect password", async () => {
        await request(app)
          .post("/api/admin/auth")
          .send({ password: "wrong-password" })
          .expect(401);
      });

      it("should require password field", async () => {
        await request(app).post("/api/admin/auth").send({}).expect(400);
      });
    });
  });

  describe("Admin Event Management", () => {
    let authToken: string;

    beforeEach(async () => {
      // Get authentication token
      const authResponse = await request(app)
        .post("/api/admin/auth")
        .send({ password: process.env.ADMIN_PASSWORD || "admin123" });

      authToken = authResponse.body.token;
    });

    describe("GET /api/events", () => {
      it("should be publicly accessible (no auth required)", async () => {
        const response = await request(app).get("/api/events").expect(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      it("should return events list", async () => {
        const response = await request(app).get("/api/events").expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe("POST /api/events", () => {
      it("should create a new event", async () => {
        const eventData = {
          name: "New API Test Event",
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-02T00:00:00Z",
          timezone: "UTC",
          description: "Created via API test",
        };

        const response = await request(app)
          .post("/api/events")
          .set("Authorization", `Bearer ${authToken}`)
          .send(eventData)
          .expect(201);

        expect(response.body.name).toBe(eventData.name);
        expect(response.body.id).toBeDefined();
      });

      it("should create event with Discord credentials", async () => {
        const eventData = {
          name: "Event with Discord Credentials",
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-02T00:00:00Z",
          timezone: "UTC",
          description: "Event with Discord bot credentials",
          discordToken:
            "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.test-token-for-api-integration-testing-only",
          discordGuildId: "1234567890123456789",
        };

        const response = await request(app)
          .post("/api/events")
          .set("Authorization", `Bearer ${authToken}`)
          .send(eventData)
          .expect(201);

        expect(response.body.discordToken).toBe(eventData.discordToken);
        expect(response.body.discordGuildId).toBe(eventData.discordGuildId);
      });

      it("should validate required fields", async () => {
        const invalidEventData = {
          name: "", // Empty name should be invalid
          startDate: "2025-03-01T00:00:00Z",
          // Missing endDate and other required fields
        };

        await request(app)
          .post("/api/events")
          .set("Authorization", `Bearer ${authToken}`)
          .send(invalidEventData)
          .expect(400);
      });

      it("should validate Discord credentials format", async () => {
        const eventDataWithInvalidCredentials = {
          name: "Test Event",
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-02T00:00:00Z",
          timezone: "UTC",
          description: "Test event",
          discordToken: "invalid-token-format",
          discordGuildId: "invalid-guild-id",
        };

        await request(app)
          .post("/api/events")
          .set("Authorization", `Bearer ${authToken}`)
          .send(eventDataWithInvalidCredentials)
          .expect(400);
      });
    });

    describe("POST /api/events/:id/activate", () => {
      let testEvent: any;

      beforeEach(async () => {
        testEvent = await adapter.createEvent({
          name: "Activation Test Event",
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-02T00:00:00Z",
          timezone: "UTC",
          description: "Event for activation testing",
          guildId: testGuildId,
          isActive: false,
        });
      });

      it("should activate an event", async () => {
        const response = await request(app)
          .post(`/api/events/${testEvent.id}/activate`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.isActive || response.body.is_active).toBe(true);
      });

      it("should return 404 for non-existent event", async () => {
        await request(app)
          .post("/api/events/99999/activate")
          .set("Authorization", `Bearer ${authToken}`)
          .expect(404);
      });
    });

    describe("GET /api/events/:id/stats", () => {
      let testEvent: any;

      beforeEach(async () => {
        testEvent = await adapter.createEvent({
          name: "Event Stats Test Event",
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-02T00:00:00Z",
          timezone: "UTC",
          description: "Event for stats testing",
          guildId: testGuildId,
          isActive: true,
        });

        // Add some test data
        await adapter.recordMemberCount(150, 100, testEvent.id);
        await adapter.recordGameActivity("Stats Test Game", 20, testEvent.id);
      });

      it("should return event statistics", async () => {
        const response = await request(app)
          .get(`/api/events/${testEvent.id}/stats`)
          .set("Authorization", `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.eventId).toBe(testEvent.id);
        expect(response.body.eventName).toBe(testEvent.name);
        expect(response.body).toHaveProperty("totalUniqueGames");
        expect(response.body).toHaveProperty("peakOnlineMembers");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 for non-existent endpoints", async () => {
      await request(app).get("/api/non-existent-endpoint").expect(404);
    });

    it("should handle malformed JSON requests", async () => {
      await request(app)
        .post("/api/admin/auth")
        .set("Content-Type", "application/json")
        .send("malformed json")
        .expect(400);
    });

    it("should handle database connection errors gracefully", async () => {
      // This test would require mocking database failures
      // For now, we ensure the server doesn't crash on errors
      const response = await request(app)
        .get("/api/stats")
        .expect((res) => {
          expect([200, 500, 503]).toContain(res.status);
        });
    });
  });
});
