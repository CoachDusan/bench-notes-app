/* Bench Notes offline cache.
   Bump CACHE when index.html changes so devices pick up the new version. */
const CACHE = "bench-notes-a2b177cf7f";
const CORE = ["./", "./index.html", "./manifest.webmanifest",
              "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      /* Only this app's own old caches. Every one of these apps is served from
         coachdusan.github.io, and cache storage belongs to the whole origin,
         not to a folder — so "delete everything that isn't mine" threw away
         Paint Touches' and Practise Organiser's offline copies, leaving them
         unable to open without signal. Notes were never at risk; the offline
         copies were. */
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith("bench-notes-") && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // App shell: cache first, so a dead arena still opens the app.
  // Refresh in the background when there is signal.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
