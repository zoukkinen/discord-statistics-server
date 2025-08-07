import { Component, createSignal, createResource, For, Show } from 'solid-js';
import { configStore } from '../stores/configStore';

interface EventSummary {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  uniquePlayers: number;
  uniqueGames: number;
  totalSessions: number;
  totalMinutes: number;
}

const Header: Component = () => {
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);

  // Fetch completed events
  const [eventSummaries] = createResource<EventSummary[]>(async () => {
    try {
      const response = await fetch('/api/events/summaries');
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching event summaries:', error);
      return [];
    }
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: configStore.timezone
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEventStatus = () => {
    if (configStore.isEventActive) {
      return {
        text: `🟢 Live Event - ${configStore.daysRemaining} days remaining`,
        class: 'status-active'
      };
    } else if (configStore.isUpcoming) {
      return {
        text: `⏳ Upcoming Event - Starts in ${configStore.daysUntilStart} days`,
        class: 'status-upcoming'
      };
    } else {
      return {
        text: '✅ Event completed',
        class: 'status-completed'
      };
    }
  };

  const navigateToEvent = (eventId: number) => {
    window.location.href = `/events/${eventId}`;
    setIsMenuOpen(false);
  };

  const navigateToAdmin = () => {
    window.location.href = '/admin';
    setIsMenuOpen(false);
  };

  const navigateHome = () => {
    window.location.href = '/';
    setIsMenuOpen(false);
  };

  return (
    <header class="header">
      <div class="header-content">
        <div class="header-top">
          <button 
            class="burger-menu"
            onClick={() => setIsMenuOpen(!isMenuOpen())}
            aria-label="Menu"
          >
            <span class="burger-line"></span>
            <span class="burger-line"></span>
            <span class="burger-line"></span>
          </button>
          
          <div class="title-section">
            <h1 class="main-title">
              <span class="emoji">🎮</span>
              {configStore.eventName}
            </h1>
            <div class="subtitle">
              <span class="event-name">Discord Activity Tracker</span>
              <span class={`event-status ${getEventStatus().class}`}>
                {getEventStatus().text}
              </span>
            </div>
            <div class="event-dates">
              {formatDate(configStore.startDate)} - {formatDate(configStore.endDate)}
            </div>
          </div>
        </div>

        {/* Burger Menu Overlay */}
        <Show when={isMenuOpen()}>
          <div class="menu-overlay" onClick={() => setIsMenuOpen(false)}>
            <nav class="burger-nav" onClick={(e) => e.stopPropagation()}>
              <div class="nav-header">
                <h3>Navigation</h3>
                <button class="close-menu" onClick={() => setIsMenuOpen(false)}>×</button>
              </div>
              
              <div class="nav-section">
                <button class="nav-item" onClick={navigateHome}>
                  🏠 Current Dashboard
                </button>
                <button class="nav-item" onClick={navigateToAdmin}>
                  ⚙️ Admin Panel
                </button>
              </div>

              <div class="nav-section">
                <h4>Completed Events</h4>
                <Show 
                  when={eventSummaries.loading}
                  fallback={
                    <Show 
                      when={eventSummaries() && eventSummaries()!.length > 0}
                      fallback={<div class="nav-item disabled">No completed events</div>}
                    >
                      <For each={eventSummaries()!.filter(event => !event.isActive)}>
                        {(event) => (
                          <button 
                            class="nav-item event-item"
                            onClick={() => navigateToEvent(event.id)}
                          >
                            <div class="event-item-content">
                              <div class="event-name">{event.name}</div>
                              <div class="event-details">
                                {formatEventDate(event.startDate)} - {formatEventDate(event.endDate)}
                              </div>
                              <div class="event-stats">
                                {event.uniquePlayers} players • {event.uniqueGames} games
                              </div>
                            </div>
                          </button>
                        )}
                      </For>
                    </Show>
                  }
                >
                  <div class="nav-item disabled">Loading events...</div>
                </Show>
              </div>
            </nav>
          </div>
        </Show>
      </div>
    </header>
  );
};

export default Header;
