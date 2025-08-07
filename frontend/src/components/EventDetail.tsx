import { Component, createSignal, onMount, Show, createEffect } from 'solid-js';
import { statsStore } from '../stores/statsStore';
import Header from './Header';
import Footer from './Footer';
import StatsCards from './StatsCards';
import Charts from './Charts';
import TopGames from './TopGames';

interface EventDetailProps {
  eventId: string;
}

const EventDetail: Component<EventDetailProps> = (props) => {
  console.log('EventDetail: Component created with eventId:', props.eventId);
  const [isLoading, setIsLoading] = createSignal(true);
  const [event, setEvent] = createSignal<any>(null);
  const [error, setError] = createSignal<string | null>(null);

  // Track store changes
  createEffect(() => {
    console.log('EventDetail: Store top games changed, count:', statsStore.topGames.length);
    console.log('EventDetail: Store member history changed, count:', statsStore.memberHistory.length);
  });

  onMount(async () => {
    console.log('EventDetail: onMount started for eventId:', props.eventId);
    try {
      // Fetch event details
      console.log('EventDetail: About to fetch /api/events/' + props.eventId);
      const response = await fetch(`/api/events/${props.eventId}`);
      console.log('EventDetail: Event fetch response status:', response.status);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Event not found');
        } else {
          setError('Failed to load event details');
        }
        return;
      }

      const eventData = await response.json();
      setEvent(eventData);

      // Fetch event-specific top games using date range
      console.log('EventDetail: Fetching top games for date range:', eventData.startDate, 'to', eventData.endDate);
      const topGamesResponse = await fetch(
        `/api/top-games?start=${eventData.startDate}&end=${eventData.endDate}&limit=999`
      );
      if (topGamesResponse.ok) {
        const eventTopGames = await topGamesResponse.json();
        console.log('EventDetail: Received top games:', eventTopGames.length, 'games');
        console.log('EventDetail: First game:', eventTopGames[0]);
        statsStore.setTopGames(eventTopGames);
      } else {
        console.error('EventDetail: Failed to fetch top games:', topGamesResponse.status);
      }

      // Fetch event-specific member history
      console.log('EventDetail: Fetching member history for date range:', eventData.startDate, 'to', eventData.endDate);
      const memberHistoryResponse = await fetch(
        `/api/member-history?start=${eventData.startDate}&end=${eventData.endDate}`
      );
      if (memberHistoryResponse.ok) {
        const eventMemberHistory = await memberHistoryResponse.json();
        console.log('EventDetail: Received member history:', eventMemberHistory.length, 'data points');
        console.log('EventDetail: First data point:', eventMemberHistory[0]);
        statsStore.setMemberHistory(eventMemberHistory);
      } else {
        console.error('EventDetail: Failed to fetch member history:', memberHistoryResponse.status);
      }

      // Test: verify store data was set
      setTimeout(() => {
        console.log('EventDetail: Final verification - Top games in store:', statsStore.topGames.length);
        console.log('EventDetail: Final verification - Member history in store:', statsStore.memberHistory.length);
      }, 100);
      
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event details');
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
