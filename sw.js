// Service worker : rend l'application installable et utilisable avec un réseau faible.
// Stratégie « réseau d'abord » : on prend toujours la dernière version quand il y a du réseau,
// sinon la copie gardée en mémoire. Changez le numéro de CACHE pour forcer un nettoyage.
const CACHE = "maa-fenua-v8";
const SHELL = ["./", "index.html", "css/style.css", "js/app.js", "js/config.js", "js/store-local.js", "js/store-firebase.js",
  "vendor/leaflet.js", "vendor/leaflet.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "icons/photos/ananas.jpg", "icons/photos/papaye.jpg", "icons/photos/coco.jpg", "icons/photos/patate.jpg", "icons/photos/corossol.jpg", "icons/photos/plant.jpg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});

// Toucher une notification ouvre (ou ramène au premier plan) l'application.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
