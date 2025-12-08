import { Component, createSignal, onMount, Show } from "solid-js";
import { statsStore } from "../stores/statsStore";
import Header from "./Header";
import Footer from "./Footer";
import StatsCards from "./StatsCards";
import Charts from "./Charts";
import TopGames from "./TopGames";

interface EventDetailProps {
  eventId: string;
}

const EventDetail: Component<EventDetailProps> = (props) => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [event, setEvent] = createSignal<any>(null);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      // Fetch event details
      const response = await fetch(`/api/events/${props.eventId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Event not found");
        } else {
          setError("Failed to load event details");
        }
        return;
      }

      const eventData = await response.json();
      setEvent(eventData);

      // Fetch event-specific top games using date range
      const topGamesResponse = await fetch(
        `/api/top-games?start=${eventData.startDate}&end=${eventData.endDate}&limit=999`
      );
      if (topGamesResponse.ok) {
        const eventTopGames = await topGamesResponse.json();
        statsStore.setTopGames(eventTopGames);
      } else {
        console.error("Failed to fetch top games:", topGamesResponse.status);
      }

      // Fetch event-specific member history
      const memberHistoryResponse = await fetch(
        `/api/member-history?start=${eventData.startDate}&end=${eventData.endDate}`
      );
      if (memberHistoryResponse.ok) {
        const eventMemberHistory = await memberHistoryResponse.json();
        statsStore.setMemberHistory(eventMemberHistory);
      } else {
        console.error(
          "Failed to fetch member history:",
          memberHistoryResponse.status
        );
      }
    } catch (err) {
      console.error("Error loading event:", err);
      setError("Failed to load event details");
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <div class="app">
      <Header />

      <main class="main-content">
        <Show when={error()}>
          <div class="error-container">
            <div class="error-content">
              <h2>⚠️ {error()}</h2>
            </div>
          </div>
        </Show>

        <Show when={!error()}>
          {isLoading() ? (
            <div class="loading-container">
              <div class="loading-spinner">🎮</div>
              <div class="loading-text">Loading Event Data...</div>
            </div>
          ) : (
            <>
              <StatsCards isHistorical={true} />

              <div class="content-grid">
                <div class="left-column">
                  <Charts eventName={event()?.name || "Assembly Summer 2025"} />
                </div>

                <div class="right-column">
                  <TopGames showAll={true} />
                </div>
              </div>
            </>
          )}
        </Show>
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
