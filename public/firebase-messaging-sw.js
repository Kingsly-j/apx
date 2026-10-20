/* Firebase Messaging service worker. Config is injected at runtime by the browser client. */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

let messagingStarted = false;
self.addEventListener("message", event => {
  if (event.data?.type !== "FIREBASE_CONFIG" || messagingStarted) return;
  firebase.initializeApp(event.data.config);
  firebase.messaging().onBackgroundMessage(({ notification, data }) => {
    self.registration.showNotification(notification?.title || "Shipment update", {
      body: notification?.body || "Your tracked shipment has been updated.",
      data: { url: data?.url || "/track" },
      icon: "/icon.svg",
    });
  });
  messagingStarted = true;
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/track", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url.startsWith(self.location.origin));
    return existing ? existing.navigate(url).then(() => existing.focus()) : self.clients.openWindow(url);
  }));
});
