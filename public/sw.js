/* Service worker: ειδοποιήσεις συνομιλίας (Web Push).
 * Το push το στέλνει το Appwrite Function `chat-notify` σε κάθε νέο μήνυμα.
 * Payload: { title, body, url, idStudent, sender }
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Νέο μήνυμα", body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Οι ανοιχτές σελίδες φέρνουν αμέσως το νέο μήνυμα (συνομιλία, καμπανάκι).
      for (const client of windows) {
        client.postMessage({ type: "chat-message", idStudent: data.idStudent, sender: data.sender });
      }

      // Χωρίς ειδοποίηση αν η ίδια συνομιλία είναι ήδη ανοιχτή και ορατή.
      const target = data.url ? new URL(data.url, self.location.origin) : null;
      const alreadyOpen = windows.some((c) => {
        if (c.visibilityState !== "visible" || !target) return false;
        const u = new URL(c.url);
        return u.pathname === target.pathname && u.search === target.search;
      });
      if (alreadyOpen) return;

      await self.registration.showNotification(data.title || "Νέο μήνυμα", {
        body: data.body || "",
        icon: "/login_logo.png",
        badge: "/login_logo.png",
        tag: `chat-${data.idStudent ?? "x"}`,
        renotify: true,
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const same = windows.find((c) => c.url === url);
      if (same) return same.focus();
      const any = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (any) {
        await any.focus();
        return any.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
