/* sw.js - Service worker for faster loading
 *
 * HOW TO USE
 * 1. Put this file in the SAME folder as your index.html (your frontend folder).
 * 2. Add this snippet just before </body> in index.html:
 *
 *    <script>
 *      if ("serviceWorker" in navigator) {
 *        window.addEventListener("load", function () {
 *          navigator.serviceWorker.register("sw.js");
 *        });
 *      }
 *    </script>
 *
 * 3. Commit and push. After the first visit, repeat visits load from cache.
 *
 * When you update your site, change CACHE_VERSION (e.g. v1 -> v2)
 * so visitors get the new files.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = "site-cache-" + CACHE_VERSION;

// Files saved right away on first visit. Edit this list to match your site.
// Use relative paths. Remove any that don't exist (a missing file breaks install).
const PRECACHE_URLS = [
  "./",
  "index.html"
];

// Install: save the core files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete old caches from previous versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: decide how to serve each request
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle normal GET requests from our own site
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages (HTML): try the network first, fall back to cache when offline/slow
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("index.html")))
    );
    return;
  }

  // Everything else (images, CSS, JS, fonts): cache first, then update in background
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchAndUpdate = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchAndUpdate;
    })
  );
});
