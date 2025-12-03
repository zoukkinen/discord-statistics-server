// Frontend tests for configStore
import { describe, it, expect, beforeEach, vi } from "vitest";
import { configStore } from "../src/stores/configStore";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("configStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadConfig", () => {
    it("should load configuration successfully", async () => {
      const mockResponse = {
        event: {
          name: "Test Event",
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-01-02T00:00:00Z",
          timezone: "UTC",
          description: "Test event description",
        },
        isEventActive: true,
        hasEventStarted: true,
        activeEventId: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await configStore.loadConfig();

      expect(configStore.eventName).toBe("Test Event");
      expect(configStore.isEventActive).toBe(true);
      expect(configStore.hasEventStarted).toBe(true);
      expect(configStore.activeEventId).toBe(1);
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await configStore.loadConfig();

      // Should keep default values on error
      expect(configStore.eventName).toBe("Assembly Summer 2025");
    });

    it("should handle non-ok responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await configStore.loadConfig();

      // Should keep default values on error
      expect(configStore.eventName).toBe("Assembly Summer 2025");
    });
  });

  describe("computed properties", () => {
    beforeEach(async () => {
      const mockResponse = {
        event: {
          name: "Future Event",
          startDate: "2030-01-01T00:00:00Z", // Future date
          endDate: "2030-01-02T00:00:00Z",
          timezone: "UTC",
          description: "Future test event",
        },
        isEventActive: false,
        hasEventStarted: false,
        activeEventId: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await configStore.loadConfig();
    });

    it("should calculate isUpcoming correctly", () => {
      expect(configStore.isUpcoming).toBe(true);
    });

    it("should calculate eventState correctly for upcoming event", () => {
      expect(configStore.eventState).toBe("upcoming");
    });

    it("should calculate daysUntilStart correctly", () => {
      const daysUntilStart = configStore.daysUntilStart;
      expect(daysUntilStart).toBeGreaterThan(0);
    });

    it("should calculate daysRemaining correctly", () => {
      const daysRemaining = configStore.daysRemaining;
      expect(daysRemaining).toBeGreaterThan(0);
    });
  });

  describe("date calculations", () => {
    it("should handle active event state", async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
      const endDate = new Date(now.getTime() + 86400000).toISOString(); // 1 day from now

      const mockResponse = {
        event: {
          name: "Active Event",
          startDate,
          endDate,
          timezone: "UTC",
          description: "Currently active event",
        },
        isEventActive: true,
        hasEventStarted: true,
        activeEventId: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await configStore.loadConfig();

      expect(configStore.isEventActive).toBe(true);
      expect(configStore.hasEventStarted).toBe(true);
      expect(configStore.eventState).toBe("active");
      expect(configStore.daysUntilStart).toBe(0);
    });

    it("should handle completed event state", async () => {
      const now = new Date();
      const startDate = new Date(now.getTime() - 172800000).toISOString(); // 2 days ago
      const endDate = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago

      const mockResponse = {
        event: {
          name: "Completed Event",
          startDate,
          endDate,
          timezone: "UTC",
          description: "Past event",
        },
        isEventActive: false,
        hasEventStarted: true,
        activeEventId: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await configStore.loadConfig();

      expect(configStore.isEventActive).toBe(false);
      expect(configStore.hasEventStarted).toBe(true);
      expect(configStore.eventState).toBe("completed");
      expect(configStore.daysRemaining).toBe(0);
    });
  });
});
