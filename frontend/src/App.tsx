import { Component, createSignal, onMount, onCleanup, Show } from 'solid-js';
import Header from './components/Header';
import Footer from './components/Footer';
import StatsCards from './components/StatsCards';
import CurrentlyPlaying from './components/CurrentlyPlaying';
import TopGames from './components/TopGames';
import RecentActivity from './components/RecentActivity';
import Charts from './components/Charts';
import InfoModal from './components/InfoModal';
import InstallButton from './components/InstallButton';
import EventManager from './components/EventManager';
import AdminAuth from './components/AdminAuth';
import { statsStore } from './stores/statsStore';
import { configStore } from './stores/configStore';
import './styles/eventManager.css';
import './styles/adminAuth.css';

const App: Component = () => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [showRecentActivity, setShowRecentActivity] = createSignal(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = createSignal(false);
  
  // Create a reactive signal for the current route
  const [currentRoute, setCurrentRoute] = createSignal(
    window.location.pathname === '/admin' ? 'admin' : 'dashboard'
  );
  
  let refreshInterval: NodeJS.Timeout;
  let updateInterval: NodeJS.Timeout;

  const updateRoute = () => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setCurrentRoute('admin');
    } else {
      setCurrentRoute('dashboard');
    }
  };

  onMount(async () => {
    // Set initial route
    updateRoute();
    
    // Force another route update after a short delay to ensure it's detected
    setTimeout(updateRoute, 100);
    
    // Listen for route changes
    window.addEventListener('popstate', updateRoute);
    
    // Check for existing admin authentication if on admin route
    if (window.location.pathname === '/admin') {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          const response = await fetch('/api/admin/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          const result = await response.json();
          if (result.valid) {
            setIsAdminAuthenticated(true);
          } else {
            localStorage.removeItem('adminToken');
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('adminToken');
        }
      }
    }
    
    // Check URL parameters for recent activity display
    const urlParams = new URLSearchParams(window.location.search);
    setShowRecentActivity(urlParams.get('activity') === 'show');
    
    // Only load dashboard data if not on admin page
    if (currentRoute() === 'dashboard') {
      // Initialize configuration
      await configStore.loadConfig();
      
      // Load initial data
      await statsStore.fetchCurrentStats();
      await statsStore.fetchTopGames();
      
      // Only fetch recent activity if it should be shown
      if (showRecentActivity()) {
        await statsStore.fetchRecentActivity();
      }
    }
    
    setIsLoading(false);

    // Setup refresh interval only for dashboard
    if (currentRoute() === 'dashboard') {
      refreshInterval = setInterval(async () => {
        await statsStore.fetchCurrentStats();
        await statsStore.fetchTopGames();
        
        // Only fetch recent activity if it should be shown
        if (showRecentActivity()) {
          await statsStore.fetchRecentActivity();
        }
      }, 15000); // 15 seconds
    }

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
    window.removeEventListener('popstate', updateRoute);
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    if (updateInterval) {
      clearInterval(updateInterval);
    }
  });

    // Render admin interface or dashboard based on route
  console.log('Rendering with route:', currentRoute());
  console.log('Current pathname:', window.location.pathname);
  console.log('Is admin path?', window.location.pathname === '/admin');
  console.log('Is admin authenticated?', isAdminAuthenticated());
  
  // Define admin page component with reactivity
  const AdminPage = () => (
    <Show
      when={isAdminAuthenticated()}
      fallback={
        <AdminAuth onAuthenticated={() => {
          console.log('Authentication successful, setting state to true');
          setIsAdminAuthenticated(true);
        }} />
      }
    >
      <EventManager onLogout={() => {
        console.log('Logging out, setting state to false');
        localStorage.removeItem('adminToken');
        setIsAdminAuthenticated(false);
      }} />
    </Show>
  );
  
  // Render admin interface or dashboard based on route
  if (window.location.pathname === '/admin') {
    console.log('Should render admin with auth check');
    return <AdminPage />;
  }
  
  return (
    <div class="app">
      <Header />
      
      <main class="main-content">
        {/* Event Status Banner for upcoming events */}
        {!configStore.isEventActive && configStore.isUpcoming && (
          <div class="event-banner upcoming">
            <div class="banner-content">
              <div class="banner-icon">⏳</div>
              <div class="banner-text">
                <h3>Upcoming Event: {configStore.eventName}</h3>
                <p>Event starts in {configStore.daysUntilStart} days • Stay tuned for activity tracking!</p>
              </div>
            </div>
          </div>
        )}
        
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
