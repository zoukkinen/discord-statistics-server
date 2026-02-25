import {
  Component,
  createSignal,
  createResource,
  For,
  Show,
  createEffect,
} from "solid-js";
import { Portal } from "solid-js/web";
import { configStore } from "../stores/configStore";

interface EventDetailOverride {
  name: string;
  startDate: string;
  endDate: string;
}

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

interface HeaderProps {
  event?: EventDetailOverride;
}

const Header: Component<HeaderProps> = (props) => {
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const [currentPath, setCurrentPath] = createSignal(window.location.pathname);

  // Listen for route changes
  createEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  });

  // Add effect to manage body class when menu opens/closes
  createEffect(() => {
    if (isMenuOpen()) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
  });

  // Fetch completed events with enhanced data
  const [eventSummaries] = createResource<EventSummary[]>(async () => {
    try {
      const response = await fetch("/api/events/summaries");
      if (response.ok) {
        const events = await response.json();

        // For each event, fetch member history to get peak online players
        const enhancedEvents = await Promise.all(
          events.map(async (event: any) => {
            try {
              const memberHistoryResponse = await fetch(
                `/api/member-history?start=${event.startDate}&end=${event.endDate}`,
              );
              if (memberHistoryResponse.ok) {
                const memberHistory = await memberHistoryResponse.json();
                const peakOnline = memberHistory.reduce(
                  (max: number, point: any) =>
                    Math.max(max, point.online_members),
                  0,
                );

                // Also get total games count
                const topGamesResponse = await fetch(
                  `/api/top-games?start=${event.startDate}&end=${event.endDate}&limit=999`,
                );
                let totalGames = event.uniqueGames; // fallback to original
                if (topGamesResponse.ok) {
                  const games = await topGamesResponse.json();
                  totalGames = games.length;
                }

                return {
                  ...event,
                  uniquePlayers: peakOnline, // Replace unique players with peak online
                  uniqueGames: totalGames, // Replace with actual total games count
                };
              }
            } catch (error) {
              console.error(
                "Error fetching enhanced data for event:",
                event.id,
                error,
              );
            }
            return event; // fallback to original data
          }),
        );

        return enhancedEvents;
      }
      return [];
    } catch (error) {
      console.error("Error fetching event summaries:", error);
      return [];
    }
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: configStore.timezone,
    });
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isEventCompleted = (event: EventSummary) => {
    const now = new Date();
    const eventEndDate = new Date(event.endDate);
    return !event.isActive && eventEndDate < now;
  };

  const getEventStatus = () => {
    // Check if we're on an event detail page using reactive signal
    const isEventDetailPage = currentPath().startsWith("/events/");

    if (isEventDetailPage) {
      // For historical events, always show as completed
      return {
        text: "✅ Completed event",
        class: "status-completed",
      };
    }

    // For main dashboard, use current config
    if (configStore.isEventActive) {
      return {
        text: `🟢 Live Event - ${configStore.daysRemaining} days remaining`,
        class: "status-active",
      };
    } else if (configStore.isUpcoming) {
      return {
        text: `⏳ Upcoming Event - Starts in ${configStore.daysUntilStart} days`,
        class: "status-upcoming",
      };
    } else {
      return {
        text: "✅ Event completed",
        class: "status-completed",
      };
    }
  };

  const navigateToEvent = (eventId: number) => {
    window.location.href = `/events/${eventId}`;
    setIsMenuOpen(false);
  };

  const navigateToAdmin = () => {
    window.location.href = "/admin";
    setIsMenuOpen(false);
  };

  const navigateHome = () => {
    window.location.href = "/";
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
              {props.event ? props.event.name : configStore.eventName}
            </h1>
            <div class="subtitle">
              <span class="event-name">Discord Activity Tracker</span>
              <span class={`event-status ${getEventStatus().class}`}>
                {getEventStatus().text}
              </span>
            </div>
            <div class="event-dates">
              {props.event
                ? `${formatEventDate(props.event.startDate)} - ${formatEventDate(props.event.endDate)}`
                : `${formatDate(configStore.startDate)} - ${formatDate(configStore.endDate)}`}
            </div>
          </div>
        </div>

        {/* Burger Menu Overlay */}
        <Portal>
          <Show when={isMenuOpen()}>
            <div class="menu-overlay" onClick={() => setIsMenuOpen(false)}>
              <nav class="burger-nav" onClick={(e) => e.stopPropagation()}>
                <div class="nav-header">
                  <h3>Navigation</h3>
                  <button
                    class="close-menu"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    ×
                  </button>
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
                        fallback={
                          <div class="nav-item disabled">
                            No completed events
                          </div>
                        }
                      >
                        <For
                          each={eventSummaries()!.filter((event) =>
                            isEventCompleted(event),
                          )}
                        >
                          {(event) => (
                            <button
                              class="nav-item event-item"
                              onClick={() => navigateToEvent(event.id)}
                            >
                              <div class="event-item-content">
                                <div class="event-name">{event.name}</div>
                                <div class="event-details">
                                  {formatEventDate(event.startDate)} -{" "}
                                  {formatEventDate(event.endDate)}
                                </div>
                                <div class="event-stats">
                                  {event.uniquePlayers} peak online •{" "}
                                  {event.uniqueGames} games
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
        </Portal>
      </div>
    </header>
  );
};

export default Header;
