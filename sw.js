/* গল্পকথা — offline cache (ডাটা ছাড়া খেলতে) */
const CACHE = "golpokotha-v1";
const PRECACHE = ["./", "./index.html", "./bg.jpeg", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil((async()=>{
    const ks = await caches.keys();
    await Promise.all(ks.map(k => k===CACHE?null:caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never intercept socket.io / websocket traffic — online mode needs live network
  if (url.pathname.startsWith("/socket.io")) return;
  if (req.mode === "navigate") {
    e.respondWith((async()=>{
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE); c.put("./index.html", net.clone());
        return net;
      } catch {
        const cached = await caches.match("./index.html", {ignoreSearch:true});
        return cached || new Response("Offline", {status:503});
      }
    })());
    return;
  }
  e.respondWith((async()=>{
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      if (net && net.status === 200 && (url.origin === location.origin)) {
        const c = await caches.open(CACHE); c.put(req, net.clone());
      }
      return net;
    } catch {
      return cached || new Response("", {status: 504});
    }
  })());
});
