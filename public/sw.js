const CACHE_VERSION = "v20260405-11";
const SHELL_CACHE = `sketchable-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `sketchable-images-${CACHE_VERSION}`;
const RUNTIME_CACHE = `sketchable-runtime-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/styles.css?v=20260405-11",
  "/app.js?v=20260405-11",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => Promise.resolve())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, IMAGE_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "CLEAR_RUNTIME_CACHE") {
    event.waitUntil(
      Promise.all([caches.delete(SHELL_CACHE), caches.delete(IMAGE_CACHE), caches.delete(RUNTIME_CACHE)])
    );
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw _error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/image/")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.pathname.startsWith("/thumb/")) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.pathname === "/auth/me" || url.pathname === "/api/images" || url.pathname === "/api/state") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".png")
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});
