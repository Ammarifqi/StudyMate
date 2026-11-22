const CACHE_NAME = "studymate-shell-v13";
const APP_SHELL = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./supabase-config.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("studymate-shell-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  const cachedResponse = caches.match(request);
  if (!self.navigator.onLine) {
    event.respondWith(
      cachedResponse.then(cached => cached || new Response(
        "This page is not available offline yet.",
        { status: 503, statusText: "Offline" }
      ))
    );
    return;
  }

  if (url.pathname.endsWith("/supabase-config.js")) {
    const configController = new AbortController();
    const configTimeout = setTimeout(
      () => configController.abort(),
      2000
    );
    const freshConfig = fetch(request, { signal: configController.signal })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .then(() => response);
        }

        return response;
      })
      .finally(() => clearTimeout(configTimeout));

    event.respondWith(
      freshConfig.catch(() => caches.match(request))
    );
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  const networkResponse = fetch(request, { signal: controller.signal }).then(response => {
    if (response.ok) {
      const copy = response.clone();
      return caches.open(CACHE_NAME)
        .then(cache => cache.put(request, copy))
        .then(() => response);
    }

    return response;
  }).finally(() => clearTimeout(timeout));

  event.respondWith(
    cachedResponse.then(cached => cached || networkResponse)
  );
  event.waitUntil(networkResponse.then(() => undefined).catch(() => undefined));
});
