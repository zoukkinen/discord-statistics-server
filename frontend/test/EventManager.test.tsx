// Frontend tests for EventManager component
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import EventManager from "../src/components/EventManager";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock confirm dialog
global.confirm = vi.fn();

describe("EventManager Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should render event manager interface", async () => {
    // Mock the events API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(() => <EventManager />);

    expect(screen.getByText("Create New Event")).toBeInTheDocument();
    expect(screen.getByText("Manage Events")).toBeInTheDocument();
  });

  it("should display list of events", async () => {
    const mockEvents = [
      {
        id: 1,
        name: "Test Event 1",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "First test event",
        isActive: true,
        createdAt: "2024-12-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
        guildId: "test-guild-123",
      },
      {
        id: 2,
        name: "Test Event 2",
        startDate: "2025-02-01T00:00:00Z",
        endDate: "2025-02-02T00:00:00Z",
        timezone: "UTC",
        description: "Second test event",
        isActive: false,
        createdAt: "2024-12-02T00:00:00Z",
        updatedAt: "2024-12-02T00:00:00Z",
        guildId: "test-guild-123",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    });

    render(() => <EventManager />);

    await waitFor(() => {
      expect(screen.getByText("Test Event 1")).toBeInTheDocument();
      expect(screen.getByText("Test Event 2")).toBeInTheDocument();
    });

    // Check if active status is displayed
    expect(screen.getByText("🎯 ACTIVE")).toBeInTheDocument();
  });

  it("should handle form submission for creating new event", async () => {
    // Mock initial events fetch (empty list)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    // Mock successful event creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 1,
          name: "New Test Event",
          startDate: "2025-03-01T00:00:00Z",
          endDate: "2025-03-02T00:00:00Z",
          timezone: "UTC",
          description: "Created via form",
        }),
    });

    // Mock refetch after creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(() => <EventManager />);

    // Fill out the form
    const nameInput = screen.getByLabelText(/Event Name/i);
    const startDateInput = screen.getByLabelText(/Start Date & Time/i);
    const endDateInput = screen.getByLabelText(/End Date & Time/i);
    const descriptionInput = screen.getByLabelText(/Description/i);

    fireEvent.input(nameInput, { target: { value: "New Test Event" } });
    fireEvent.input(startDateInput, {
      target: { value: "2025-03-01T00:00:00" },
    });
    fireEvent.input(endDateInput, { target: { value: "2025-03-02T00:00:00" } });
    fireEvent.input(descriptionInput, {
      target: { value: "Created via form" },
    });

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Check if the API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("New Test Event"),
      });
    });
  });

  it("should validate form inputs", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(() => <EventManager />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole("button", { name: /Create Event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Event name is required/i)).toBeInTheDocument();
    });
  });

  it("should handle Discord credentials input", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(() => <EventManager />);

    // Find Discord credentials section
    const tokenInput = screen.getByLabelText(/Discord Bot Token/i);
    const guildIdInput = screen.getByLabelText(/Discord Server ID/i);

    expect(tokenInput).toBeInTheDocument();
    expect(guildIdInput).toBeInTheDocument();

    // Test input
    fireEvent.input(tokenInput, {
      target: {
        value:
          "MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10.test-token-for-frontend-testing",
      },
    });
    fireEvent.input(guildIdInput, {
      target: { value: "1234567890123456789" },
    });

    expect(tokenInput.value).toContain("MTQwMDEwNzY0NDExNDU2NzIzOA");
    expect(guildIdInput.value).toBe("1234567890123456789");
  });

  it("should handle event activation", async () => {
    const mockEvents = [
      {
        id: 1,
        name: "Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Test event",
        isActive: false,
        createdAt: "2024-12-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
        guildId: "test-guild-123",
      },
    ];

    // Mock events fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    });

    // Mock activation request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockEvents[0], isActive: true }),
    });

    // Mock refetch after activation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ ...mockEvents[0], isActive: true }]),
    });

    // Mock confirm dialog
    global.confirm.mockReturnValue(true);

    render(() => <EventManager />);

    await waitFor(() => {
      const activateButton = screen.getByText(/Set as Active/i);
      fireEvent.click(activateButton);
    });

    expect(global.confirm).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith("/api/events/1/activate", {
      method: "POST",
    });
  });

  it("should handle error responses", async () => {
    // Mock failed events fetch
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    render(() => <EventManager />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
    });
  });

  it("should display event statistics in popup", async () => {
    const mockEvents = [
      {
        id: 1,
        name: "Test Event",
        startDate: "2025-01-01T00:00:00Z",
        endDate: "2025-01-02T00:00:00Z",
        timezone: "UTC",
        description: "Test event",
        isActive: true,
        createdAt: "2024-12-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
        guildId: "test-guild-123",
      },
    ];

    const mockStats = {
      eventId: 1,
      eventName: "Test Event",
      totalUniqueGames: 5,
      totalGameSessions: 100,
      peakOnlineMembers: 200,
      averageOnlineMembers: 150,
      totalActiveHours: 48,
      topGame: {
        name: "Popular Game",
        totalPlayers: 50,
        peakPlayers: 25,
      },
    };

    // Mock events fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockEvents),
    });

    // Mock stats fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockStats),
    });

    // Mock window.open
    const mockWindow = {
      document: {
        write: vi.fn(),
      },
    };
    global.window.open = vi.fn().mockReturnValue(mockWindow);

    render(() => <EventManager />);

    await waitFor(() => {
      const viewStatsButton = screen.getByText(/View Stats/i);
      fireEvent.click(viewStatsButton);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/events/1/stats");
    expect(global.window.open).toHaveBeenCalledWith(
      "",
      "_blank",
      "width=800,height=600"
    );
  });
});
