// Service worker: rede primeiro (sempre a versão mais nova) e cache como reserva offline.
const CACHE = "garimpo-v2";
const CORE = [
  "./", "index.html", "css/style.css", "manifest.webmanifest", "favicon.svg",
  "js/app.js", "js/core.js", "js/store.js", "js/sound.js", "js/sprites.js", "js/fx.js", "js/achievements.js",
  "js/data/index.js", "js/data/geo.js", "js/data/comida.js", "js/data/tv.js", "js/data/musica.js",
  "js/data/futebol.js", "js/data/lingua.js", "js/data/natureza.js", "js/data/ciencia.js",
  "js/data/cotidiano.js", "js/data/historia.js", "js/data/tech.js", "js/data/pop.js", "js/data/mundo.js",
  "js/data/extra.js", "js/data/extra2.js", "js/data/extra3.js", "js/data/extra4.js",
  "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!sameOrigin && !isFont) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html")))
  );
});
