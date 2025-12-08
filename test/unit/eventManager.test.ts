// Unit tests for EventManager utilities
import { EventManager } from "../../src/types/events";

describe("EventManager", () => {
  describe("getEventStatus", () => {
    it('should return "upcoming" for future events', () => {
      const now = new Date();
      const futureStart = new Date(now.getTime() + 86400000).toISOString(); // Tomorrow
      const futureEnd = new Date(now.getTime() + 172800000).toISOString(); // Day after tomorrow

      const status = EventManager.getEventStatus(futureStart, futureEnd);
      expect(status).toBe("upcoming");
    });

    it('should return "active" for current events', () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 86400000).toISOString(); // Yesterday
      const futureEnd = new Date(now.getTime() + 86400000).toISOString(); // Tomorrow

      const status = EventManager.getEventStatus(pastStart, futureEnd);
      expect(status).toBe("active");
    });

    it('should return "completed" for past events', () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 172800000).toISOString(); // 2 days ago
      const pastEnd = new Date(now.getTime() - 86400000).toISOString(); // Yesterday

      const status = EventManager.getEventStatus(pastStart, pastEnd);
      expect(status).toBe("completed");
    });

    it("should handle edge cases correctly", () => {
      const now = new Date();

      // Event starting exactly now
      const startNow = now.toISOString();
      const endLater = new Date(now.getTime() + 86400000).toISOString();
      expect(EventManager.getEventStatus(startNow, endLater)).toBe("active");

      // Event ending in 1 second (still active)
      const startEarlier = new Date(now.getTime() - 86400000).toISOString();
      const endSoon = new Date(now.getTime() + 1000).toISOString();
      expect(EventManager.getEventStatus(startEarlier, endSoon)).toBe("active");
    });
  });

  describe("isEventCurrentlyActive", () => {
    it("should return true for active events", () => {
      const now = new Date();
      const pastStart = new Date(now.getTime() - 86400000).toISOString();
      const futureEnd = new Date(now.getTime() + 86400000).toISOString();

      expect(EventManager.isEventCurrentlyActive(pastStart, futureEnd)).toBe(
        true
      );
    });

    it("should return false for inactive events", () => {
      const now = new Date();

      // Upcoming event
      const futureStart = new Date(now.getTime() + 86400000).toISOString();
      const futureEnd = new Date(now.getTime() + 172800000).toISOString();
      expect(EventManager.isEventCurrentlyActive(futureStart, futureEnd)).toBe(
        false
      );

      // Completed event
      const pastStart = new Date(now.getTime() - 172800000).toISOString();
      const pastEnd = new Date(now.getTime() - 86400000).toISOString();
      expect(EventManager.isEventCurrentlyActive(pastStart, pastEnd)).toBe(
        false
      );
    });
  });

  describe("createFromEnvironment", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("should create event from environment variables", () => {
      process.env.EVENT_NAME = "Test Event";
      process.env.EVENT_START_DATE = "2025-01-01T00:00:00Z";
      process.env.EVENT_END_DATE = "2025-01-02T00:00:00Z";
      process.env.EVENT_TIMEZONE = "UTC";
      process.env.EVENT_DESCRIPTION = "Test Description";

      const guildId = "1234567890123456789";
      const event = EventManager.createFromEnvironment(guildId);

      expect(event).toEqual({
        name: "Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Test Description",
        guildId: guildId,
        isActive: true,
      });
    });

    it("should use default values when environment variables are missing", () => {
      delete process.env.EVENT_NAME;
      delete process.env.EVENT_START_DATE;
      delete process.env.EVENT_END_DATE;
      delete process.env.EVENT_TIMEZONE;
      delete process.env.EVENT_DESCRIPTION;

      const guildId = "1234567890123456789";
      const event = EventManager.createFromEnvironment(guildId);

      expect(event).toEqual({
        name: "Assembly Summer 2025",
        startDate: "2025-07-31T07:00:00Z",
        endDate: "2025-08-03T13:00:00Z",
        timezone: "Europe/Helsinki",
        description: "Discord activity tracking for Assembly Summer 2025",
        guildId: guildId,
        isActive: true,
      });
    });
  });
});
