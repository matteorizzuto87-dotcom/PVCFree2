// sw.js
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());

// (opzionale) risposte di fallback
self.addEventListener("fetch", (event) => {
  // Lascia pass-through tutte le richieste
  return;
});
