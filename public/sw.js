// Service Worker for Discord Activity Tracker PWA
const CACHE_VERSION = Date.now(); // Use timestamp for unique cache versions
const CACHE_NAME = `discord-stats-v${CACHE_VERSION}`;
const STATIC_CACHE = `static-v${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache static resources only
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing with cache version', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
      .then(() => {
        // Force immediate activation
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all caches that don't match current version
          if (!cacheName.includes(CACHE_VERSION.toString())) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  
  // NEVER cache the main HTML file - always fetch fresh
  if (requestUrl.pathname === '/' || requestUrl.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          console.log('Service Worker: Fetching fresh HTML');
          return response;
        })
        .catch(() => {
          // Only on network failure, provide basic offline page
          return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>Discord Stats - Offline</title>
  <style>
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #000; color: #fff; }
    .offline { color: #00ff9d; }
    button { background: #00ff9d; color: #000; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px; }
  </style>
</head>
<body>
  <h1 class="offline">🎮 Discord Activity Tracker</h1>
  <p>You're currently offline. Please check your internet connection.</p>
  <p>The app will work normally once you're back online.</p>
  <button onclick="window.location.reload()">Retry</button>
</body>
</html>`, { headers: { 'Content-Type': 'text/html' } });
        })
    );
    return;
  }

  // For API requests, always fetch from network first (fresh data is critical)
  if (requestUrl.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          console.log('Service Worker: Fresh API data fetched');
          return response;
        })
        .catch(() => {
          // Return error response for failed API calls
          console.log('Service Worker: API request failed, returning error');
          return new Response(JSON.stringify({ error: 'Offline' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          });
        })
    );
    return;
  }

  // For static assets (fonts, external libraries), use cache first
  if (requestUrl.host !== location.host || 
      requestUrl.pathname.includes('fonts.googleapis.com') || 
      requestUrl.pathname.includes('cdn.jsdelivr.net')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Service Worker: Serving static asset from cache');
            return cachedResponse;
          }
          
          // Not in cache, fetch and cache
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // For everything else, network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Performing background sync');
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23000000"/><text x="50" y="65" font-size="60" text-anchor="middle" fill="%2300ff9d">🎮</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎮</text></svg>',
      vibrate: [200, 100, 200],
      data: data.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Discord Activity Update', options)
    );
  }
});

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});