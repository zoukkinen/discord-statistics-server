import { Component, createSignal, onMount, Show } from 'solid-js';
import { statsStore } from '../stores/statsStore';
import Header from './Header';
import Footer from './Footer';
import StatsCards from './StatsCards';
import Charts from './Charts';
import CurrentlyPlaying from './CurrentlyPlaying';
import TopGames from './TopGames';

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
          setError('Event not found');
        } else {
          setError('Failed to load event details');
        }
        return;
      }

      const eventData = await response.json();
      setEvent(eventData);

      // Load stats data for this specific event
      // Note: We'll need to modify the stats endpoints to accept eventId parameter
      await statsStore.fetchCurrentStats();
      await statsStore.fetchTopGames();
      
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const goBack = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div class="app">
      <Header />
      
      <main class="main-content">
        <Show when={error()}>
          <div class="error-container">
            <div class="error-content">
              <h2>⚠️ {error()}</h2>
              <button 
                class="back-button"
                onClick={goBack}
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </Show>

        <Show when={!error()}>
          <div class="event-header">
            <button 
              class="back-button"
              onClick={goBack}
            >
              ← Back to Dashboard
            </button>
            
            <Show when={event()}>
              <div class="event-info">
                <h1 class="event-title">{event()?.name}</h1>
                <div class="event-dates">
                  {formatDate(event()?.start_date)} - {formatDate(event()?.end_date)}
                </div>
                <Show when={event()?.description}>
                  <p class="event-description">{event()?.description}</p>
                </Show>
              </div>
            </Show>
          </div>

          {isLoading() ? (
            <div class="loading-container">
              <div class="loading-spinner">🎮</div>
              <div class="loading-text">Loading Event Data...</div>
            </div>
          ) : (
            <>
              <StatsCards />
              
              <div class="content-grid">
                <div class="left-column">
                  <Charts />
                  <CurrentlyPlaying />
                </div>
                
                <div class="right-column">
                  <TopGames />
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
