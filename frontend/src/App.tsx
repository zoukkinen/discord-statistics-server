import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import CurrentlyPlaying from './components/CurrentlyPlaying';
import TopGames from './components/TopGames';
import RecentActivity from './components/RecentActivity';
import Charts from './components/Charts';
import InfoModal from './components/InfoModal';
import InstallButton from './components/InstallButton';
import { statsStore } from './stores/statsStore';
import { configStore } from './stores/configStore';

const App: Component = () => {
  const [isLoading, setIsLoading] = createSignal(true);
  let refreshInterval: number;

  onMount(async () => {
    // Initialize configuration
    await configStore.loadConfig();
    
    // Load initial data
    await statsStore.fetchCurrentStats();
    await statsStore.fetchTopGames();
    await statsStore.fetchRecentActivity();
    
    setIsLoading(false);

    // Setup refresh interval
    refreshInterval = setInterval(async () => {
      await statsStore.fetchCurrentStats();
      await statsStore.fetchTopGames();
      await statsStore.fetchRecentActivity();
    }, 15000); // 15 seconds

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('New version available! Refresh to update?')) {
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.log('Service Worker registration failed:', error);
      }
    }
  });

  onCleanup(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  return (
    <div class="app">
      <Header />
      
      <main class="main-content">
        {isLoading() ? (
          <div class="loading-container">
            <div class="loading-spinner">🎮</div>
            <div class="loading-text">Loading Discord Activity...</div>
          </div>
        ) : (
          <>
            <StatsCards />
            
            <div class="content-grid">
              <div class="left-column">
                <CurrentlyPlaying />
                <TopGames />
              </div>
              
              <div class="right-column">
                <RecentActivity />
                <Charts />
              </div>
            </div>
          </>
        )}
      </main>

      <InfoModal />
      <InstallButton />
    </div>
  );
};

export default App;
