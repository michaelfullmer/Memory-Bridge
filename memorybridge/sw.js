const CACHE_NAME = 'memorybridge-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
];

// Install — cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin API calls (Anthropic, OpenAI, xAI, Google)
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('api.anthropic.com') ||
    event.request.url.includes('api.openai.com') ||
    event.request.url.includes('api.x.ai') ||
    event.request.url.includes('generativelanguage.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
