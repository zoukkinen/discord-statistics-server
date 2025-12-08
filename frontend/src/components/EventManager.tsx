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
  isHidden: boolean;
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
  peakTotalMembers: number;
  averageOnlineMembers: number;
  totalActiveHours: number;
  eventDurationHours: number;
  topGames: Array<{
    game_name: string;
    total_minutes: number;
    unique_players: number;
    total_sessions: number;
  }>;
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
  const [statsModal, setStatsModal] = createSignal<EventStats | null>(null);
  const [editModal, setEditModal] = createSignal<EventData | null>(null);
  const [deleteModal, setDeleteModal] = createSignal<EventData | null>(null);
  const [isDeleting, setIsDeleting] = createSignal(false);
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

  const editEvent = (event: EventData) => {
    setEditModal(event);
  };

  const saveEventEdit = async (updatedEvent: Partial<EventData>) => {
    if (!editModal()) return;

    try {
      const response = await fetch(`/api/events/${editModal()!.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedEvent),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(`Event "${result.name}" updated successfully!`);
        setEditModal(null);
        refetchEvents();
      } else {
        showMessage(result.error || "Failed to update event", "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    }
  };

  const confirmDelete = (event: EventData) => {
    setDeleteModal(event);
  };

  const deleteEvent = async () => {
    if (!deleteModal()) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/events/${deleteModal()!.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message || "Event deleted successfully!");
        setDeleteModal(null);
        refetchEvents();
      } else {
        showMessage(result.error || "Failed to delete event", "error");
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleHidden = async (event: EventData) => {
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isHidden: !event.isHidden }),
      });

      const result = await response.json();

      if (response.ok) {
        const action = result.isHidden ? "hidden" : "visible";
        showMessage(`Event "${result.name}" is now ${action}!`);
        refetchEvents();
      } else {
        showMessage(
          result.error || "Failed to update event visibility",
          "error"
        );
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, "error");
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
                <div
                  class={`event-card ${event.isActive ? "active" : ""} ${
                    event.isHidden ? "hidden" : ""
                  }`}
                >
                  <div class="event-header">
                    <h3 class="event-title">
                      {event.name}
                      <Show when={event.isHidden}>
                        <span class="hidden-badge">👁️‍🗨️ HIDDEN</span>
                      </Show>
                    </h3>
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
                    <button
                      class="btn secondary small"
                      onClick={() => editEvent(event)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      class="btn secondary small"
                      onClick={() => toggleHidden(event)}
                      title={
                        event.isHidden
                          ? "Show on frontend"
                          : "Hide from frontend"
                      }
                    >
                      {event.isHidden ? "👁️ Show" : "🙈 Hide"}
                    </button>
                    <Show when={!event.isActive}>
                      <button
                        class="btn danger small"
                        onClick={() => confirmDelete(event)}
                      >
                        🗑️ Delete
                      </button>
                    </Show>
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
                  <div class="stat-card">
                    <h3>👥 Online</h3>
                    <div class="big-number">{stats().peakOnlineMembers}</div>
                    <div class="stat-secondary">
                      peak of {stats().peakTotalMembers} members
                    </div>
                  </div>

                  <div class="stat-card">
                    <h3>🎮 Games</h3>
                    <div class="big-number">{stats().totalUniqueGames}</div>
                    <div class="stat-secondary">Total games played</div>
                  </div>

                  <div class="stat-card">
                    <h3>🎯 Players</h3>
                    <div class="big-number">{stats().totalGameSessions}</div>
                    <div class="stat-secondary">Gaming sessions</div>
                  </div>

                  <div class="stat-card">
                    <h3>📅 Event Period</h3>
                    <div class="big-number">
                      {(() => {
                        const hours = stats().eventDurationHours;
                        const days = Math.floor(hours / 24);
                        const remainingHours = hours % 24;
                        return days > 0
                          ? `${days}d ${remainingHours}h`
                          : `${hours}h`;
                      })()}
                    </div>
                    <div class="stat-secondary">Duration tracked</div>
                  </div>
                </div>

                <Show when={stats().topGames && stats().topGames.length > 0}>
                  <div class="top-games-section">
                    <h3>🏆 Top Games</h3>
                    <div class="game-list">
                      <For each={stats().topGames.slice(0, 10)}>
                        {(game, index) => (
                          <div class="game-item">
                            <span class="game-rank">
                              {index() === 0
                                ? "🥇"
                                : index() === 1
                                ? "🥈"
                                : index() === 2
                                ? "🥉"
                                : `#${index() + 1}`}
                            </span>
                            <div class="game-info">
                              <div class="game-name" title={game.game_name}>
                                {game.game_name}
                              </div>
                              <div class="game-stats">
                                {(() => {
                                  const minutes = game.total_minutes;
                                  const hours = Math.floor(minutes / 60);
                                  const mins = Math.round(minutes % 60);
                                  if (hours >= 24) {
                                    const days = Math.floor(hours / 24);
                                    const remainingHours = hours % 24;
                                    return days > 0 && remainingHours > 0
                                      ? `${days}d ${remainingHours}h`
                                      : `${days}d`;
                                  }
                                  return mins > 0
                                    ? `${hours}h ${mins}m`
                                    : `${hours}h`;
                                })()}{" "}
                                • {game.unique_players} players
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        )}
      </Show>

      {/* Edit Event Modal */}
      <Show when={editModal()}>
        {(event) => {
          const [editFormData, setEditFormData] = createSignal({
            name: event().name,
            startDate: new Date(event().startDate).toISOString().slice(0, 16),
            endDate: new Date(event().endDate).toISOString().slice(0, 16),
            timezone: event().timezone,
            description: event().description || "",
          });

          const handleEditChange = (field: string, value: string) => {
            setEditFormData((prev) => ({ ...prev, [field]: value }));
          };

          const handleSaveEdit = () => {
            const data = editFormData();
            saveEventEdit({
              name: data.name,
              startDate: new Date(data.startDate).toISOString(),
              endDate: new Date(data.endDate).toISOString(),
              timezone: data.timezone,
              description: data.description,
            });
          };

          return (
            <div class="modal-overlay" onClick={() => setEditModal(null)}>
              <div
                class="modal-content edit-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div class="modal-header">
                  <h2>✏️ Edit Event</h2>
                  <button
                    class="close-button"
                    onClick={() => setEditModal(null)}
                  >
                    ✕
                  </button>
                </div>

                <div class="modal-body">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSaveEdit();
                    }}
                  >
                    <div class="form-grid">
                      <div class="form-group full-width">
                        <label for="edit-name">Event Name *</label>
                        <input
                          type="text"
                          id="edit-name"
                          value={editFormData().name}
                          onInput={(e) =>
                            handleEditChange("name", e.currentTarget.value)
                          }
                          required
                        />
                      </div>

                      <div class="form-group">
                        <label for="edit-timezone">Timezone</label>
                        <select
                          id="edit-timezone"
                          value={editFormData().timezone}
                          onChange={(e) =>
                            handleEditChange("timezone", e.currentTarget.value)
                          }
                        >
                          <option value="Europe/Helsinki">
                            Europe/Helsinki
                          </option>
                          <option value="Europe/London">Europe/London</option>
                          <option value="America/New_York">
                            America/New_York
                          </option>
                          <option value="America/Los_Angeles">
                            America/Los_Angeles
                          </option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>

                      <div class="form-group">
                        <label for="edit-start">Start Date & Time *</label>
                        <input
                          type="datetime-local"
                          id="edit-start"
                          value={editFormData().startDate}
                          onInput={(e) =>
                            handleEditChange("startDate", e.currentTarget.value)
                          }
                          required
                        />
                      </div>

                      <div class="form-group">
                        <label for="edit-end">End Date & Time *</label>
                        <input
                          type="datetime-local"
                          id="edit-end"
                          value={editFormData().endDate}
                          onInput={(e) =>
                            handleEditChange("endDate", e.currentTarget.value)
                          }
                          required
                        />
                      </div>

                      <div class="form-group full-width">
                        <label for="edit-description">Description</label>
                        <textarea
                          id="edit-description"
                          value={editFormData().description}
                          onInput={(e) =>
                            handleEditChange(
                              "description",
                              e.currentTarget.value
                            )
                          }
                          rows={3}
                        />
                      </div>
                    </div>

                    <div class="modal-actions">
                      <button
                        type="button"
                        class="btn secondary"
                        onClick={() => setEditModal(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" class="btn primary">
                        💾 Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          );
        }}
      </Show>

      {/* Delete Confirmation Modal */}
      <Show when={deleteModal()}>
        {(event) => (
          <div class="modal-overlay" onClick={() => setDeleteModal(null)}>
            <div
              class="modal-content delete-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="modal-header">
                <h2>⚠️ Confirm Deletion</h2>
                <button
                  class="close-button"
                  onClick={() => setDeleteModal(null)}
                >
                  ✕
                </button>
              </div>

              <div class="modal-body">
                <div class="warning-box">
                  <p class="warning-title">🚨 This action cannot be undone!</p>
                  <p>You are about to permanently delete the event:</p>
                  <p class="event-name-highlight">
                    <strong>"{event().name}"</strong>
                  </p>
                  <p class="warning-details">This will also delete:</p>
                  <ul class="delete-items">
                    <li>📊 All member statistics</li>
                    <li>🎮 All game statistics</li>
                    <li>⏱️ All game session records</li>
                    <li>📈 All historical data</li>
                  </ul>
                  <p class="final-warning">
                    <strong>
                      Are you absolutely sure you want to proceed?
                    </strong>
                  </p>
                </div>

                <div class="modal-actions">
                  <button
                    class="btn secondary"
                    onClick={() => setDeleteModal(null)}
                    disabled={isDeleting()}
                  >
                    ↩️ Cancel
                  </button>
                  <button
                    class="btn danger"
                    onClick={deleteEvent}
                    disabled={isDeleting()}
                  >
                    {isDeleting() ? "🔄 Deleting..." : "🗑️ Yes, Delete Forever"}
                  </button>
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
