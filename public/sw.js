const CACHE = "yaosheng-v2";
const PRECACHE = [
  "/",
  "/start",
  "/today",
  "/talk",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/manifest.json",
  "/phrases.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined)))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let title = "藥聲";
  let body = "";
  let url = "/today";
  try {
    const data = event.data && event.data.json();
    if (data && typeof data.title === "string") title = data.title.slice(0, 80);
    if (data && typeof data.body === "string") body = data.body.slice(0, 180);
    if (data && typeof data.url === "string" && data.url.startsWith("/")) url = data.url;
  } catch {
    /* A push with no JSON still opens today. */
  }
  event.waitUntil(self.registration.showNotification(title, { body, data: { url }, icon: "/icons/icon-192.png" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url && String(event.notification.data.url).startsWith("/")
    ? event.notification.data.url
    : "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((client) => "focus" in client);
      if (open) {
        open.focus();
        if ("navigate" in open) return open.navigate(target);
        return undefined;
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => undefined);
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
  );
});
