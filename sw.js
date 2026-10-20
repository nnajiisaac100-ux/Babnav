/*
  sw.js — the service worker (Phase 12)

  A service worker is a script the browser keeps running in the background,
  separate from the page. Every network request the app makes passes through
  it first, so it can answer from a cache instead of the network. That is what
  makes an installed web app work offline.

  Three things to understand before editing this file:

  1. It only runs over https or on localhost. On a plain http:// address —
     including your laptop's IP on the WiFi — the browser refuses to register
     it. That is a security rule, not a bug.

  2. It updates on its own schedule. Change this file and the browser fetches
     the new one, installs it in the background, and waits until every tab of
     the app is closed before activating. js/pwa.js shows a "Reload" prompt so
     the user can skip that wait.

  3. Bump CACHE_VERSION whenever you change any cached file. Otherwise people
     keep the old one and cannot understand why your fix did nothing.

  Two caches, on purpose:
    SHELL  the app itself. Cached at install, served cache-first. Small,
           fixed, and the reason Babnav opens instantly and offline.
    TILES  map images, cached as they are used, capped. OpenStreetMap's usage
           policy allows normal browser caching but forbids bulk downloading,
           so we never pre-fetch tiles — only keep ones you actually looked at.
*/

const CACHE_VERSION = "v10";
const SHELL = "babnav-shell-" + CACHE_VERSION;
const TILES = "babnav-tiles-" + CACHE_VERSION;
const TILE_LIMIT = 400;

const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/boundary.js",
  "./js/voice.js",
  "./js/config.js",
  "./js/timetable.js",
  "./js/info.js",
  "./js/search.js",
  "./js/route.js",
  "./js/locate.js",
  "./js/favourites.js",
  "./js/map.js",
  "./js/sheet.js",
  "./js/app.js",
  "./js/pwa.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

/* ---------- Install: fill the shell cache ---------- */
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      // addAll fails entirely if one file 404s, which would leave the app
      // with no cache at all. Add them one at a time so a single missing
      // file cannot break the install.
      return Promise.all(SHELL_FILES.map(function (url) {
        return cache.add(url).catch(function () {
          console.warn("[sw] could not cache", url);
        });
      }));
    })
  );
});

/* ---------- Activate: throw away caches from older versions ---------- */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        if (name !== SHELL && name !== TILES) return caches.delete(name);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- The page can ask us to activate immediately ---------- */
self.addEventListener("message", function (event) {
  if (event.data === "skip-waiting") self.skipWaiting();
});

/* ---------- Helpers ---------- */

function isTile(url) {
  return url.hostname.indexOf("tile.openstreetmap.org") > -1;
}

function isRouting(url) {
  return url.hostname.indexOf("routing.openstreetmap.de") > -1;
}

// Keep the tile cache from growing without limit. Oldest entries go first,
// which is roughly the areas you looked at longest ago.
async function trimTiles() {
  const cache = await caches.open(TILES);
  const keys = await cache.keys();
  if (keys.length <= TILE_LIMIT) return;
  await Promise.all(keys.slice(0, keys.length - TILE_LIMIT).map(function (key) {
    return cache.delete(key);
  }));
}

/* ---------- Fetch ---------- */
self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Routing must never come from a cache. A stale route is a wrong route,
  // and route.js already handles the network being unavailable.
  if (isRouting(url)) return;

  // Map tiles: use the cached copy if we have one, otherwise fetch and keep
  // it. This is what lets you re-open a part of campus you have already
  // looked at while offline.
  if (isTile(url)) {
    event.respondWith(
      caches.open(TILES).then(async function (cache) {
        const hit = await cache.match(request);
        if (hit) return hit;

        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            trimTiles();
          }
          return response;
        } catch (err) {
          // Offline and this tile was never visited: a transparent 1x1 PNG
          // keeps the map grid intact instead of showing broken images.
          return new Response(
            Uint8Array.from(atob(
              "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            ), function (c) { return c.charCodeAt(0); }),
            { headers: { "Content-Type": "image/png" } }
          );
        }
      })
    );
    return;
  }

  // The app's own files: network first, so a fresh data.js or script always
  // wins when you are online. The cached copy is only used when offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (hit) {
          if (hit) return hit;
          if (request.mode === "navigate") return caches.match("./index.html");
          return new Response("", { status: 504, statusText: "Offline" });
        });
      })
    );
    return;
  }

  // Third-party files (Leaflet from unpkg): cache first.
  event.respondWith(
    caches.match(request).then(function (hit) {
      return hit || fetch(request);
    })
  );
});
