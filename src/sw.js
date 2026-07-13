const channel = new BroadcastChannel("sw-messages");

self.onsystemmessage = (evt) => {
  try {
    const serviceHandler = async () => {
      if (evt.name === "activity") {
        let handler = evt.data.webActivityRequestHandler();

        if (!handler || !handler.source) {
          throw new Error("Handler oder handler.source ist undefined");
        }

        channel.postMessage({
          oauth_success: handler.source.data,
        });
      } else {
        channel.postMessage({
          action: "error",
          oauth_success: activityName,
        });
      }
    };

    evt.waitUntil(serviceHandler());
  } catch (e) {
    channel.postMessage({
      action: "error",
      content: e.message || String(e),
      stack: e.stack,
    });
  }
};

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (var i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url == "/" && "focus" in client) return client.focus();
        }
        if (clients.openWindow) {
          return clients
            .openWindow(new URL("/", self.location.origin))
            .then((w) => w.focus());
        }
        if (clients.openApp) {
          return clients.openApp();
        }
      })
      .catch((err) => {
        console.log(err);
      }),
  );
});

const userAgent =
  typeof self !== "undefined" && self.navigator && self.navigator.userAgent
    ? self.navigator.userAgent
    : "";

if (userAgent && !userAgent.includes("KAIOS")) {
  const CACHE_NAME = "pwa-cache-v2.240500023";
  const FILE_LIST_URL = "file-list.json";

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(CACHE_NAME)
        .then((cache) => {
          console.log("Opened cache");

          // Fetch the file list JSON and cache the URLs
          return fetch(FILE_LIST_URL)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
              }
              return response.json();
            })
            .then((urlsToCache) => {
              // Ensure urlsToCache is an array
              if (Array.isArray(urlsToCache)) {
                return Promise.all(
                  urlsToCache.map((url) =>
                    cache.add(url).catch((error) => {
                      console.error(`Failed to cache ${url}:`, error);
                    }),
                  ),
                );
              } else {
                console.error("Fetched data is not an array:", urlsToCache);
              }
            });
        })
        .then(() => {
          return self.skipWaiting(); // Skip waiting and activate the new SW immediately
        }),
    );
  });

  self.addEventListener("activate", (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              return caches.delete(cacheName);
            }
          }),
        );
      }),
    );
  });

  // Serve files from cache when offline
  self.addEventListener("fetch", (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // If the request is in the cache, return it. Otherwise, fetch from the network.
        return response || fetch(event.request);
      }),
    );
  });
}
