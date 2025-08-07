import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import Header from './components/Header';
import Footer from './components/Footer';
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
  const [showRecentActivity, setShowRecentActivity] = createSignal(false);
  let refreshInterval: NodeJS.Timeout;
  let updateInterval: NodeJS.Timeout;

  onMount(async () => {
    // Check URL parameters for recent activity display
    const urlParams = new URLSearchParams(window.location.search);
    setShowRecentActivity(urlParams.get('activity') === 'show');
    
    // Initialize configuration
    await configStore.loadConfig();
    
    // Load initial data
    await statsStore.fetchCurrentStats();
    await statsStore.fetchTopGames();
    
    // Only fetch recent activity if it should be shown
    if (showRecentActivity()) {
      await statsStore.fetchRecentActivity();
    }
    
    setIsLoading(false);

    // Setup refresh interval
    refreshInterval = setInterval(async () => {
      await statsStore.fetchCurrentStats();
      await statsStore.fetchTopGames();
      
      // Only fetch recent activity if it should be shown
      if (showRecentActivity()) {
        await statsStore.fetchRecentActivity();
      }
    }, 15000); // 15 seconds

    // Register service worker with enhanced update handling
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration.scope);
        
        // Check for updates immediately
        registration.update();
        
        // Check for updates every 60 seconds
        updateInterval = setInterval(() => {
          registration.update();
        }, 60000);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available, force update
                console.log('New service worker installed, updating...');
                
                // Send message to service worker to skip waiting
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                
                // Refresh the page after a short delay
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            });
          }
        });
        
        // Handle service worker controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service Worker controller changed, reloading...');
          window.location.reload();
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
    if (updateInterval) {
      clearInterval(updateInterval);
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
                <Charts />
                <CurrentlyPlaying />
              </div>
              
              <div class="right-column">
                <TopGames />
                {showRecentActivity() && <RecentActivity />}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
      <InfoModal />
      <InstallButton />
    </div>
  );
};

export default App;
