// Unit tests for Config class
import { Config } from "../../src/config";

describe("Config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getEventConfig", () => {
    it("should return default values when environment variables are not set", () => {
      delete process.env.EVENT_NAME;
      delete process.env.EVENT_START_DATE;
      delete process.env.EVENT_END_DATE;
      delete process.env.EVENT_TIMEZONE;
      delete process.env.EVENT_DESCRIPTION;

      const config = Config.getEventConfig();

      expect(config).toEqual({
        name: "Assembly Summer 2025",
        startDate: "2025-07-31T07:00:00Z",
        endDate: "2025-08-03T13:00:00Z",
        timezone: "Europe/Helsinki",
        description: "Discord activity tracking for Assembly Summer 2025",
      });
    });

    it("should use environment variables when set", () => {
      process.env.EVENT_NAME = "Test Event";
      process.env.EVENT_START_DATE = "2025-01-01T00:00:00Z";
      process.env.EVENT_END_DATE = "2025-01-02T00:00:00Z";
      process.env.EVENT_TIMEZONE = "UTC";
      process.env.EVENT_DESCRIPTION = "Test Description";

      const config = Config.getEventConfig();

      expect(config).toEqual({
        name: "Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Test Description",
      });
    });
  });

  describe("isEventActive", () => {
    it("should return false when current time is before event start", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      process.env.EVENT_START_DATE = futureDate.toISOString();
      process.env.EVENT_END_DATE = new Date(
        futureDate.getTime() + 86400000
      ).toISOString();

      expect(Config.isEventActive()).toBe(false);
    });

    it("should return false when current time is after event end", () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      process.env.EVENT_START_DATE = new Date(
        pastDate.getTime() - 86400000
      ).toISOString();
      process.env.EVENT_END_DATE = pastDate.toISOString();

      expect(Config.isEventActive()).toBe(false);
    });

    it("should return true when current time is during event", () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 86400000); // 1 day ago
      const endDate = new Date(now.getTime() + 86400000); // 1 day from now

      process.env.EVENT_START_DATE = startDate.toISOString();
      process.env.EVENT_END_DATE = endDate.toISOString();

      expect(Config.isEventActive()).toBe(true);
    });
  });

  describe("hasEventStarted", () => {
    it("should return false when event has not started", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      process.env.EVENT_START_DATE = futureDate.toISOString();

      expect(Config.hasEventStarted()).toBe(false);
    });

    it("should return true when event has started", () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      process.env.EVENT_START_DATE = pastDate.toISOString();

      expect(Config.hasEventStarted()).toBe(true);
    });
  });

  describe("getAdminPassword", () => {
    it("should return default password when ADMIN_PASSWORD is not set", () => {
      delete process.env.ADMIN_PASSWORD;

      expect(Config.getAdminPassword()).toBe("admin123");
    });

    it("should return environment password when ADMIN_PASSWORD is set", () => {
      process.env.ADMIN_PASSWORD = "custom-password";

      expect(Config.getAdminPassword()).toBe("custom-password");
    });
  });

  describe("getEventName", () => {
    it("should return the event name from config", () => {
      process.env.EVENT_NAME = "Custom Event Name";

      expect(Config.getEventName()).toBe("Custom Event Name");
    });
  });

  describe("getEventDateRange", () => {
    it("should return start and end dates", () => {
      process.env.EVENT_START_DATE = "2025-01-01T00:00:00Z";
      process.env.EVENT_END_DATE = "2025-01-02T00:00:00Z";

      const dateRange = Config.getEventDateRange();

      expect(dateRange).toEqual({
        start: "2025-01-01T00:00:00Z",
        end: "2025-01-02T00:00:00Z",
      });
    });
  });

  describe("getEventTimezone", () => {
    it("should return the event timezone", () => {
      process.env.EVENT_TIMEZONE = "America/New_York";

      expect(Config.getEventTimezone()).toBe("America/New_York");
    });
  });

  describe("getEventDescription", () => {
    it("should return the event description", () => {
      process.env.EVENT_DESCRIPTION = "Custom event description";

      expect(Config.getEventDescription()).toBe("Custom event description");
    });
  });
});
