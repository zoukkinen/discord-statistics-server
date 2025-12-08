import { Component, createSignal, createResource, For, Show } from "solid-js";

interface EventData {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  description?: string;
  discordToken?: string;
  discordGuildId?: string;
  isActive: boolean;
  isHidden?: boolean;
  createdAt: string;
  updatedAt: string;
  guildId: string;
}

interface EventStats {
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

interface CreateEventData {
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  description: string;
  discordToken?: string;
  discordGuildId?: string;
}

interface EventManagerProps {
  onLogout?: () => void;
}

const EventManager: Component<EventManagerProps> = (props) => {
  const [message, setMessage] = createSignal<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isCreating, setIsCreating] = createSignal(false);
  const [editingEvent, setEditingEvent] = createSignal<EventData | null>(null);
  const [statsModal, setStatsModal] = createSignal<EventStats | null>(null);
  const [formData, setFormData] = createSignal<CreateEventData>({
    name: "",
    startDate: "",
    endDate: "",
    timezone: "Europe/Helsinki",
    description: "",
    discordToken: "",
    discordGuildId: "",
  });

  // Helper to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("adminToken");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Resource for fetching events
  const [events, { refetch: refetchEvents }] = createResource<EventData[]>(
    async () => {
      const response = await fetch("/api/events");
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      return response.json();
    }
  );

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFormChange = (field: keyof CreateEventData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    const data = formData();
    if (!data.name.trim()) return "Event name is required";
    if (!data.startDate) return "Start date is required";
    if (!data.endDate) return "End date is required";

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime())) return "Invalid start date";
    if (isNaN(end.getTime())) return "Invalid end date";

    if (start >= end) return "Start date must be before end date";
    return null;
  };

  const createEvent = async (e: SubmitEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (validation) {
      showMessage(validation, "error");
      return;
    }

    setIsCreating(true);

    try {
      const data = formData();

      // Additional safety check for date validity
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showMessage("Invalid date values detected", "error");
        return;
      }

      const payload = {
        name: data.name.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timezone: data.timezone,
        description: data.description.trim() || undefined,
        discordToken: data.discordToken?.trim() || undefined,
        discordGuildId: data.discordGuildId?.trim() || undefined,
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(`Event "${result.name}" created successfully!`);
        setFormData({
          name: "",
          startDate: "",
          endDate: "",
          timezone: "Europe/Helsinki",
          description: "",
          discordToken: "",
          discordGuildId: "",
        });
        refetchEvents();
      } else {
        showMessage(result.error || "Failed to create event", "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    } finally {
      setIsCreating(false);
    }
  };

  const activateEvent = async (eventId: number, eventName: string) => {
    // Find the event to check its timing
    const allEvents = events();
    const targetEvent = allEvents?.find((e) => e.id === eventId);

    if (!targetEvent) {
      showMessage("Event not found", "error");
      return;
    }

    const now = new Date();
    const start = new Date(targetEvent.startDate);
    const end = new Date(targetEvent.endDate);

    let confirmMessage = `Set "${eventName}" as the active event?`;

    if (now < start) {
      const daysUntil = Math.ceil(
        (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      confirmMessage += `\n\n⏳ This is an upcoming event starting in ${daysUntil} days.\nIt will be displayed on the frontend but tracking will begin when the event starts.`;
    } else if (now > end) {
      confirmMessage += `\n\n✅ This event has already ended.\nYou can still set it as active to display its information on the frontend.`;
    } else {
      confirmMessage += `\n\n🟢 This event is currently live and tracking will be active immediately.`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/activate`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (response.ok) {
        const status =
          now < start ? "upcoming" : now > end ? "completed" : "live";
        showMessage(`Event "${result.name}" is now active! Status: ${status}`);
        refetchEvents();
      } else {
        showMessage(result.error || "Failed to activate event", "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    }
  };

  const viewStats = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/stats`);
      const stats: EventStats = await response.json();

      if (response.ok) {
        setStatsModal(stats);
      } else {
        showMessage("Failed to load stats", "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    }
  };

  const editEvent = (event: EventData) => {
    setEditingEvent(event);
    // Convert ISO strings to datetime-local format (YYYY-MM-DDTHH:MM)
    const startDate = new Date(event.startDate).toISOString().slice(0, 16);
    const endDate = new Date(event.endDate).toISOString().slice(0, 16);

    setFormData({
      name: event.name,
      startDate: startDate,
      endDate: endDate,
      timezone: event.timezone,
      description: event.description || "",
      discordToken: "", // Don't pre-fill for security
      discordGuildId: event.discordGuildId || "",
    });

    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
    showMessage("Editing event - update the form and submit", "success");
  };

  const cancelEdit = () => {
    setEditingEvent(null);
    setFormData({
      name: "",
      startDate: "",
      endDate: "",
      timezone: "Europe/Helsinki",
      description: "",
      discordToken: "",
      discordGuildId: "",
    });
    showMessage("Edit cancelled", "success");
  };

  const toggleHideEvent = async (
    eventId: number,
    currentlyHidden: boolean,
    eventName: string
  ) => {
    const action = currentlyHidden ? "show" : "hide";
    if (
      !confirm(
        `${
          action === "hide" ? "Hide" : "Show"
        } event "${eventName}"?\n\nHidden events won't appear in the public event list but can still be managed here.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !currentlyHidden }),
      });

      if (response.ok) {
        showMessage(
          `Event "${eventName}" ${
            action === "hide" ? "hidden" : "shown"
          } successfully!`
        );
        refetchEvents();
      } else {
        const result = await response.json();
        showMessage(result.error || `Failed to ${action} event`, "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    }
  };

  const deleteEvent = async (eventId: number, eventName: string) => {
    if (
      !confirm(
        `Delete event "${eventName}"?\n\n⚠️ This will permanently delete the event. All associated statistics will remain but won't be visible through this event.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        showMessage(`Event "${eventName}" deleted successfully!`);
        refetchEvents();
      } else {
        const result = await response.json();
        showMessage(result.error || "Failed to delete event", "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventStatus = (event: EventData) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);

    if (event.isActive) return { text: "🎯 ACTIVE", class: "status-active" };
    if (now < start) return { text: "⏳ UPCOMING", class: "status-upcoming" };
    if (now > end) return { text: "✅ COMPLETED", class: "status-completed" };
    return { text: "📅 SCHEDULED", class: "status-scheduled" };
  };
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    if (props.onLogout) {
      props.onLogout();
    }
  };

  return (
    <div class="admin-container">
      <div class="admin-header">
        <div class="admin-header-content">
          <div class="admin-title">
            <h1>🎮 Event Management</h1>
            <p>Create and manage gaming events for Discord activity tracking</p>
          </div>
          <button class="logout-button" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Message Display */}
      <Show when={message()}>
        <div class={`message ${message()!.type}`}>{message()!.text}</div>
      </Show>

      {/* Create Event Form */}
      <div class="admin-section">
        <h2>📅 Create New Event</h2>
        <form onSubmit={createEvent} class="event-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="eventName">Event Name *</label>
              <input
                type="text"
                id="eventName"
                value={formData().name}
                onInput={(e) => handleFormChange("name", e.currentTarget.value)}
                placeholder="e.g., Assembly Summer 2026"
                required
              />
            </div>

            <div class="form-group">
              <label for="eventTimezone">Timezone</label>
              <select
                id="eventTimezone"
                value={formData().timezone}
                onChange={(e) =>
                  handleFormChange("timezone", e.currentTarget.value)
                }
              >
                <option value="Europe/Helsinki">Europe/Helsinki</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div class="form-group">
              <label for="startDate">Start Date & Time *</label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData().startDate}
                onInput={(e) =>
                  handleFormChange("startDate", e.currentTarget.value)
                }
                required
              />
            </div>

            <div class="form-group">
              <label for="endDate">End Date & Time *</label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData().endDate}
                onInput={(e) =>
                  handleFormChange("endDate", e.currentTarget.value)
                }
                required
              />
            </div>

            <div class="form-group full-width">
              <label for="eventDescription">Description</label>
              <textarea
                id="eventDescription"
                value={formData().description}
                onInput={(e) =>
                  handleFormChange("description", e.currentTarget.value)
                }
                placeholder="Brief description of the gaming event..."
                rows={3}
              />
            </div>

            {/* Discord Credentials Section */}
            <div class="form-group full-width discord-credentials">
              <h3>🤖 Discord Bot Configuration (Optional)</h3>
              <p class="help-text">
                Provide Discord credentials to connect this event to a specific
                Discord server. Leave empty to use the default environment
                configuration.
              </p>

              <div class="form-row">
                <div class="form-group">
                  <label for="discordToken">
                    Discord Bot Token
                    <span class="security-indicator">🔒</span>
                  </label>
                  <input
                    type="password"
                    id="discordToken"
                    value={formData().discordToken || ""}
                    onInput={(e) =>
                      handleFormChange("discordToken", e.currentTarget.value)
                    }
                    placeholder="MTQwMDEwNzY0NDExNDU2NzIzOA.GTOM10...."
                    autocomplete="off"
                  />
                  <small class="help-text">
                    Bot token from Discord Developer Portal. Will be encrypted
                    and stored securely.
                  </small>
                </div>

                <div class="form-group">
                  <label for="discordGuildId">Discord Server ID</label>
                  <input
                    type="text"
                    id="discordGuildId"
                    value={formData().discordGuildId || ""}
                    onInput={(e) =>
                      handleFormChange("discordGuildId", e.currentTarget.value)
                    }
                    placeholder="1210195869513547807"
                    pattern="[0-9]{17,19}"
                  />
                  <small class="help-text">
                    Your Discord server's ID (17-19 digit number). Enable
                    Developer Mode in Discord to copy it.
                  </small>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" class="btn primary" disabled={isCreating()}>
            {isCreating() ? "⏳ Creating..." : "🚀 Create Event"}
          </button>
        </form>
      </div>

      {/* Events List */}
      <div class="admin-section">
        <h2>📋 Manage Events</h2>

        <Show when={events.loading}>
          <div class="loading">⏳ Loading events...</div>
        </Show>

        <Show when={events.error}>
          <div class="message error">
            ❌ Error loading events: {events.error.message}
          </div>
        </Show>

        <Show when={events() && events()!.length === 0}>
          <div class="empty-state">
            <p>No events found. Create your first event above! 🎮</p>
          </div>
        </Show>

        <div class="events-grid">
          <For each={events()}>
            {(event) => {
              const status = getEventStatus(event);
              return (
                <div class={`event-card ${event.isActive ? "active" : ""}`}>
                  <div class="event-header">
                    <h3 class="event-title">{event.name}</h3>
                    <span class={`event-status ${status.class}`}>
                      {status.text}
                    </span>
                  </div>

                  <div class="event-details">
                    <p>
                      <strong>📅 Start:</strong> {formatDate(event.startDate)}
                    </p>
                    <p>
                      <strong>📅 End:</strong> {formatDate(event.endDate)}
                    </p>
                    <p>
                      <strong>🌍 Timezone:</strong> {event.timezone}
                    </p>
                    <Show when={event.description}>
                      <p>
                        <strong>📝 Description:</strong> {event.description}
                      </p>
                    </Show>
                  </div>

                  <div class="event-actions">
                    <Show when={!event.isActive}>
                      <button
                        class="btn secondary small"
                        onClick={() => activateEvent(event.id, event.name)}
                      >
                        🎯 Set Active
                      </button>
                    </Show>
                    <button
                      class="btn secondary small"
                      onClick={() => viewStats(event.id)}
                    >
                      📊 View Stats
                    </button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      {/* Stats Modal */}
      <Show when={statsModal()}>
        {(stats) => (
          <div class="modal-overlay" onClick={() => setStatsModal(null)}>
            <div
              class="modal-content stats-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="modal-header">
                <h2>📊 {stats().eventName} Statistics</h2>
                <button
                  class="close-button"
                  onClick={() => setStatsModal(null)}
                >
                  ✕
                </button>
              </div>

              <div class="modal-body">
                <div class="stats-grid">
                  <div class="stat-card" style="--card-color: #5865f2;">
                    <h3>🎮 Games</h3>
                    <p>
                      <strong>Unique Games:</strong> {stats().totalUniqueGames}
                    </p>
                    <p>
                      <strong>Total Sessions:</strong>{" "}
                      {stats().totalGameSessions}
                    </p>
                  </div>

                  <div class="stat-card" style="--card-color: #28a745;">
                    <h3>👥 Members</h3>
                    <p>
                      <strong>Peak Online:</strong> {stats().peakOnlineMembers}
                    </p>
                    <p>
                      <strong>Average Online:</strong>{" "}
                      {Math.round(stats().averageOnlineMembers)}
                    </p>
                  </div>

                  <div class="stat-card" style="--card-color: #ffc107;">
                    <h3>⏱️ Activity</h3>
                    <p>
                      <strong>Total Active Hours:</strong>{" "}
                      {Math.round(stats().totalActiveHours)}
                    </p>
                  </div>

                  <Show when={stats().topGame}>
                    {(topGame) => (
                      <div class="stat-card" style="--card-color: #dc3545;">
                        <h3>🏆 Top Game</h3>
                        <p>
                          <strong>Game:</strong> {topGame().name}
                        </p>
                        <p>
                          <strong>Total Players:</strong>{" "}
                          {topGame().totalPlayers}
                        </p>
                        <p>
                          <strong>Peak Players:</strong> {topGame().peakPlayers}
                        </p>
                      </div>
                    )}
                  </Show>
                </div>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default EventManager;
