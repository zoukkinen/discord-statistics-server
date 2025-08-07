import { Component, createSignal, createResource, For, Show } from 'solid-js';

interface EventSummary {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: 'upcoming' | 'active' | 'completed';
  basicStats?: {
    totalSessions: number;
    uniqueGames: number;
    peakMembers: number;
  };
}

interface EventSelectorProps {
  currentEventId?: number;
  onEventChange: (eventId: number) => void;
}

const EventSelector: Component<EventSelectorProps> = (props) => {
  const [showHistory, setShowHistory] = createSignal(false);
  
  // Fetch events from API
  const [events] = createResource<EventSummary[]>(async () => {
    const response = await fetch('/api/events');
    if (!response.ok) throw new Error('Failed to fetch events');
    return response.json();
  });

  const currentEvent = () => events()?.find(e => e.id === props.currentEventId);
  const historicalEvents = () => events()?.filter(e => e.id !== props.currentEventId) || [];

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800', 
      upcoming: 'bg-blue-100 text-blue-800'
    };
    return colors[status as keyof typeof colors] || colors.completed;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEventSelect = (eventId: number) => {
    props.onEventChange(eventId);
    setShowHistory(false);
  };

  return (
    <div class="event-selector">
      {/* Current Event Display */}
      <div class="current-event">
        <Show when={currentEvent()} fallback={
          <div class="event-loading">Loading event...</div>
        }>
          {(event) => (
            <div class="event-info">
              <div class="event-header">
                <h2 class="event-name">{event().name}</h2>
                <span class={`status-badge ${getStatusBadge(event().status)}`}>
                  {event().status}
                </span>
              </div>
              <div class="event-dates">
                {formatDate(event().startDate)} - {formatDate(event().endDate)}
              </div>
              <Show when={event().basicStats}>
                {(stats) => (
                  <div class="event-quick-stats">
                    <span>{stats().totalSessions} sessions</span>
                    <span>{stats().uniqueGames} games</span>
                    <span>{stats().peakMembers} peak members</span>
                  </div>
                )}
              </Show>
            </div>
          )}
        </Show>
        
        {/* History Toggle Button */}
        <button 
          class="history-toggle"
          onClick={() => setShowHistory(!showHistory())}
          disabled={events.loading}
        >
          <span class="history-icon">📚</span>
          Event History
        </button>
      </div>

      {/* Event History Modal */}
      <Show when={showHistory()}>
        <div class="event-history-modal" onClick={() => setShowHistory(false)}>
          <div class="modal-content" onClick={(e) => e.stopPropagation()}>
            <div class="modal-header">
              <h3>Event History</h3>
              <button 
                class="close-button"
                onClick={() => setShowHistory(false)}
              >
                ✕
              </button>
            </div>
            
            <div class="events-list">
              <Show when={events.loading}>
                <div class="loading-state">Loading events...</div>
              </Show>
              
              <Show when={events.error}>
                <div class="error-state">Error loading events</div>
              </Show>
              
              <For each={historicalEvents()}>
                {(event) => (
                  <div 
                    class="event-item"
                    onClick={() => handleEventSelect(event.id)}
                  >
                    <div class="event-item-header">
                      <h4 class="event-item-name">{event.name}</h4>
                      <span class={`status-badge ${getStatusBadge(event.status)}`}>
                        {event.status}
                      </span>
                    </div>
                    <div class="event-item-dates">
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </div>
                    <Show when={event.basicStats}>
                      {(stats) => (
                        <div class="event-item-stats">
                          <span>{stats().totalSessions} sessions</span>
                          <span>{stats().uniqueGames} games</span>
                          <span>Peak: {stats().peakMembers} members</span>
                        </div>
                      )}
                    </Show>
                  </div>
                )}
              </For>
              
              <Show when={historicalEvents().length === 0 && !events.loading}>
                <div class="empty-state">
                  <p>No other events found</p>
                  <p class="empty-state-subtitle">
                    This is your first event, or no historical data is available.
                  </p>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default EventSelector;
