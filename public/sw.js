// Service Worker for Discord Activity Tracker PWA
const CACHE_NAME = 'discord-stats-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For API requests, always fetch from network (with cache fallback)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we get a valid response, update cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to get from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request).then((fetchResponse) => {
          // Save to cache if it's a valid response
          if (fetchResponse && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // If both cache and network fail, return a basic offline page for HTML requests
        if (event.request.headers.get('accept').includes('text/html')) {
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>Discord Stats - Offline</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #000; color: #fff; }
                .offline { color: #00ff9d; }
              </style>
            </head>
            <body>
              <h1 class="offline">🎮 Discord Activity Tracker</h1>
              <p>You're currently offline. Please check your internet connection.</p>
              <p>The app will work normally once you're back online.</p>
            </body>
            </html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
      })
  );
});

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  if (event.tag === 'background-sync') {
    // You could implement background data syncing here
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
