const CACHE_NAME = "body-shop-parts-v3";

const APP_SHELL = [
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

// INSTALL
// Cache only static PWA assets.
// Do NOT precache index.html — we want the newest app whenever online.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );

  self.skipWaiting();
});

// ACTIVATE
// Delete every previous version of the app cache.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;

  // HTML / page navigation:
  // ALWAYS try GitHub first.
  // Never save index.html into the long-lived app cache.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static files:
  // Network first, cache as offline fallback.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(request))
  );
});

// PUSH NOTIFICATIONS
self.addEventListener("push", event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {
      body: event.data
        ? event.data.text()
        : "A part was received."
    };
  }

  const title = data.title || "Body Shop Parts";

  const options = {
    body:
      data.body ||
      "A part was received for one of your repair orders.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: {
      url: data.url || "./"
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// NOTIFICATION CLICK
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const target =
    event.notification.data?.url || "./";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true
      })
      .then(list => {
        for (const client of list) {
          if ("focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }

        return clients.openWindow
          ? clients.openWindow(target)
          : undefined;
      })
  );
});
