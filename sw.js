// Network-first: kapag online, laging kinukuha ang pinakabagong files (auto-update).
// Kapag offline, galing sa cache. Data ng user ay hindi dito naka-save.
const V = "misis-v2";
const CORE = [
  "./",
  "index.html",
  "manifest.json",
  "css/base.css",
  "css/style.css",
  "js/util.js",
  "js/core.js",
  "js/lib.js",
  "js/stock.js",
  "js/notes.js",
  "js/app.js",
  "json/categories.json",
  "assets/icon.svg"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(V)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(x => x !== V).map(x => caches.delete(x)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;

  const net = Promise.race([
    fetch(r, { cache: "no-cache" }),
    new Promise((_, rej) => setTimeout(rej, 5000))
  ]);

  e.respondWith(
    net.then(res => {
      if (res && res.ok) {
        const cp = res.clone();
        caches.open(V).then(c => c.put(r, cp));
      }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("index.html")))
  );
});
