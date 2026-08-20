// Minimal hand-rolled service worker — app-shell offline caching only.
// No push notifications, no precache manifest (avoids baking a stale build into
// the cache at install time). Bump CACHE_VERSION to force old caches to clear.
const CACHE_VERSION = "udhar-plus-v1";
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PAGE_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isImmutableAsset(url) {
  // Next.js content-hashes these — safe to cache indefinitely (a new build
  // ships new filenames, it never overwrites an existing hashed URL).
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase/Firebase/cross-origin calls
  if (url.pathname.startsWith("/api/")) return; // never cache auth/API responses

  if (request.mode === "navigate") {
    // Network-first: online users always get the freshest shell; the cached
    // copy is only ever served once the network genuinely fails, so it can't
    // strand a user on stale auth state while they have connectivity.
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          const cached = await cache.match(request);
          return cached ?? cache.match("/");
        }
      })()
    );
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSET_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })()
    );
  }
});
