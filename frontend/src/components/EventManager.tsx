import { Component, createSignal, createResource, For, Show } from 'solid-js';

interface EventData {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  description?: string;
  isActive: boolean;
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
}

interface EventManagerProps {
  onLogout?: () => void;
}

const EventManager: Component<EventManagerProps> = (props) => {
  const [message, setMessage] = createSignal<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isCreating, setIsCreating] = createSignal(false);
  const [formData, setFormData] = createSignal<CreateEventData>({
    name: '',
    startDate: '',
    endDate: '',
    timezone: 'Europe/Helsinki',
    description: ''
  });

  // Resource for fetching events
  const [events, { refetch: refetchEvents }] = createResource<EventData[]>(async () => {
    const response = await fetch('/api/events');
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }
    return response.json();
  });

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleFormChange = (field: keyof CreateEventData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    const data = formData();
    if (!data.name.trim()) return 'Event name is required';
    if (!data.startDate) return 'Start date is required';
    if (!data.endDate) return 'End date is required';

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    
    if (isNaN(start.getTime())) return 'Invalid start date';
    if (isNaN(end.getTime())) return 'Invalid end date';
    
    if (start >= end) return 'Start date must be before end date';
    return null;
  };

  const createEvent = async (e: SubmitEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (validation) {
      showMessage(validation, 'error');
      return;
    }

    setIsCreating(true);
    
    try {
      const data = formData();
      
      // Additional safety check for date validity
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        showMessage('Invalid date values detected', 'error');
        return;
      }
      
      const payload = {
        name: data.name.trim(),
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timezone: data.timezone,
        description: data.description.trim() || undefined
      };
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(`Event "${result.name}" created successfully!`);
        setFormData({
          name: '',
          startDate: '',
          endDate: '',
          timezone: 'Europe/Helsinki',
          description: ''
        });
        refetchEvents();
      } else {
        showMessage(result.error || 'Failed to create event', 'error');
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const activateEvent = async (eventId: number, eventName: string) => {
    // Find the event to check its timing
    const allEvents = events();
    const targetEvent = allEvents?.find(e => e.id === eventId);
    
    if (!targetEvent) {
      showMessage('Event not found', 'error');
      return;
    }

    const now = new Date();
    const start = new Date(targetEvent.startDate);
    const end = new Date(targetEvent.endDate);
    
    let confirmMessage = `Set "${eventName}" as the active event?`;
    
    if (now < start) {
      const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok) {
        const status = now < start ? 'upcoming' : now > end ? 'completed' : 'live';
        showMessage(`Event "${result.name}" is now active! Status: ${status}`);
        refetchEvents();
      } else {
        showMessage(result.error || 'Failed to activate event', 'error');
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, 'error');
    }
  };

  const viewStats = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/stats`);
      const stats: EventStats = await response.json();

      if (response.ok) {
        // Create a new window with the stats
        const statsWindow = window.open('', '_blank', 'width=800,height=600');
        if (statsWindow) {
          statsWindow.document.write(`
            <html>
              <head>
                <title>Event Statistics - ${stats.eventName}</title>
                <style>
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    padding: 20px; 
                    background: #f8f9fa; 
                  }
                  .stats-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                    gap: 20px; 
                    margin: 20px 0; 
                  }
                  .stat-card { 
                    background: white; 
                    padding: 20px; 
                    border-radius: 12px; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-left: 4px solid var(--color);
                  }
                  h1 { color: #333; margin-bottom: 20px; }
                  h3 { margin: 0 0 15px 0; color: #333; }
                  p { margin: 5px 0; color: #666; }
                  strong { color: #333; }
                </style>
              </head>
              <body>
                <h1>📊 ${stats.eventName} Statistics</h1>
                <div class="stats-grid">
                  <div class="stat-card" style="--color: #5865f2;">
                    <h3>🎮 Games</h3>
                    <p><strong>Unique Games:</strong> ${stats.totalUniqueGames}</p>
                    <p><strong>Total Sessions:</strong> ${stats.totalGameSessions}</p>
                  </div>
                  <div class="stat-card" style="--color: #28a745;">
                    <h3>👥 Members</h3>
                    <p><strong>Peak Online:</strong> ${stats.peakOnlineMembers}</p>
                    <p><strong>Average Online:</strong> ${Math.round(stats.averageOnlineMembers)}</p>
                  </div>
                  <div class="stat-card" style="--color: #ffc107;">
                    <h3>⏱️ Activity</h3>
                    <p><strong>Total Active Hours:</strong> ${Math.round(stats.totalActiveHours)}</p>
                  </div>
                  ${stats.topGame ? `
                  <div class="stat-card" style="--color: #dc3545;">
                    <h3>🏆 Top Game</h3>
                    <p><strong>Game:</strong> ${stats.topGame.name}</p>
                    <p><strong>Total Players:</strong> ${stats.topGame.totalPlayers}</p>
                    <p><strong>Peak Players:</strong> ${stats.topGame.peakPlayers}</p>
                  </div>
                  ` : ''}
                </div>
              </body>
            </html>
          `);
        }
      } else {
        showMessage('Failed to load stats', 'error');
      }
    } catch (error) {
      showMessage(`Network error: ${(error as Error).message}`, 'error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventStatus = (event: EventData) => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    if (event.isActive) return { text: '🎯 ACTIVE', class: 'status-active' };
    if (now < start) return { text: '⏳ UPCOMING', class: 'status-upcoming' };
    if (now > end) return { text: '✅ COMPLETED', class: 'status-completed' };
    return { text: '📅 SCHEDULED', class: 'status-scheduled' };
  };  const handleLogout = () => {
    localStorage.removeItem('adminToken');
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
        <div class={`message ${message()!.type}`}>
          {message()!.text}
        </div>
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
                onInput={(e) => handleFormChange('name', e.currentTarget.value)}
                placeholder="e.g., Assembly Summer 2026"
                required
              />
            </div>

            <div class="form-group">
              <label for="eventTimezone">Timezone</label>
              <select
                id="eventTimezone"
                value={formData().timezone}
                onChange={(e) => handleFormChange('timezone', e.currentTarget.value)}
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
                onInput={(e) => handleFormChange('startDate', e.currentTarget.value)}
                required
              />
            </div>

            <div class="form-group">
              <label for="endDate">End Date & Time *</label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData().endDate}
                onInput={(e) => handleFormChange('endDate', e.currentTarget.value)}
                required
              />
            </div>

            <div class="form-group full-width">
              <label for="eventDescription">Description</label>
              <textarea
                id="eventDescription"
                value={formData().description}
                onInput={(e) => handleFormChange('description', e.currentTarget.value)}
                placeholder="Brief description of the gaming event..."
                rows={3}
              />
            </div>
          </div>

          <button type="submit" class="btn primary" disabled={isCreating()}>
            {isCreating() ? '⏳ Creating...' : '🚀 Create Event'}
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
          <div class="message error">❌ Error loading events: {events.error.message}</div>
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
                <div class={`event-card ${event.isActive ? 'active' : ''}`}>
                  <div class="event-header">
                    <h3 class="event-title">{event.name}</h3>
                    <span class={`event-status ${status.class}`}>{status.text}</span>
                  </div>

                  <div class="event-details">
                    <p><strong>📅 Start:</strong> {formatDate(event.startDate)}</p>
                    <p><strong>📅 End:</strong> {formatDate(event.endDate)}</p>
                    <p><strong>🌍 Timezone:</strong> {event.timezone}</p>
                    <Show when={event.description}>
                      <p><strong>📝 Description:</strong> {event.description}</p>
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
    </div>
  );
};

export default EventManager;
