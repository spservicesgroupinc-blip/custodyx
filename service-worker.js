// FIX: Removed duplicate CACHE_NAME declaration and unused URLS_TO_CACHE variable.
// A versioned cache name is crucial for the update process.
const CACHE_NAME = 'custodyx-ai-v3'; // Incremented version number

// The URLs we want to precache. This list should only contain the core, local
// "app shell" files. Third-party assets are cached dynamically by the fetch handler.
const URLS_TO_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// --- INSTALL: Precache the core app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching app shell');
        return cache.addAll(URLS_TO_PRECACHE);
      })
      .catch(err => {
        console.error('Failed to cache files during install:', err);
      })
  );
});

// --- ACTIVATE: Clean up old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of open pages immediately
  );
});

// --- MESSAGE: Allow the client to trigger an immediate update ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- FETCH: Intercept network requests and apply caching strategies ---
self.addEventListener('fetch', (event) => {
  // We only cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // --- Strategy 1: Network-first for API calls ---
  // Ensures data from your API (e.g., n8n, Google Apps Script) is always fresh.
  if (url.hostname.includes('n8n.cloud') || url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Return a structured error if the network fails.
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }

  // --- Strategy 2: Stale-While-Revalidate for Google Fonts and Tailwind CSS ---
  // This is the best strategy for assets that can be updated but don't need to be live.
  // It serves the cached version immediately for speed, then fetches an update in the background.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || url.hostname === 'cdn.tailwindcss.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const fetchedResponsePromise = fetch(event.request).then((networkResponse) => {
          // If the fetch is successful, update the cache.
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
        // Return the cached response immediately if available, otherwise wait for the network response.
        return cachedResponse || fetchedResponsePromise;
      })
    );
    return;
  }

  // --- Strategy 3: Cache-first for all other assets (App Shell, local images, etc.) ---
  // This is ideal for static assets that don't change often.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return from cache if found.
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise, fetch from the network, cache it, and then return it.
      return fetch(event.request).then((networkResponse) => {
        // We need to clone the response to be able to cache it and return it.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});