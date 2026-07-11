// A-Body Service Worker — cache offline para treinar sem sinal na academia
const CACHE = "abody-v1";
const IMG_PATH = "/storage/v1/object/public/exercicios/";
const REST_BIBLIOTECA = "/rest/v1/exercicios";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // Ilustrações: cache-first (imutáveis)
  if (url.pathname.includes(IMG_PATH)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        const resp = await fetch(e.request);
        if (resp.ok) c.put(e.request, resp.clone());
        return resp;
      })
    );
    return;
  }

  // Biblioteca (REST): stale-while-revalidate — abre offline, atualiza em background
  if (url.pathname.includes(REST_BIBLIOTECA)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        const rede = fetch(e.request)
          .then((resp) => { if (resp.ok) c.put(e.request, resp.clone()); return resp; })
          .catch(() => hit);
        return hit || rede;
      })
    );
  }
});

// Tocar no aviso de descanso traz o app de volta
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) if ("focus" in c) return c.focus();
      return clients.openWindow("/");
    })
  );
});
