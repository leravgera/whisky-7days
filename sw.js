// Запасная копия сайта в браузере: после первого открытия сайт работает, даже если хостинг недоступен.
// Свежая версия берётся из сети; если сеть молчит дольше 3 секунд — показываем сохранённую копию.
// Этот файл собирается автоматически (make_sw.py), версия меняется при любом изменении сайта.
const V = "viski-9b40c095e9";
const FILES = ["./", "bonus.js", "cards.js", "game25.js", "game26.js", "game27.js", "game28.js", "game29.js", "game30.js", "game31.js", "index.html", "manifest.webmanifest", "meows.js", "mobile.js", "shell.js", "sound.js", "texts.js", "assets/apple-touch-icon.png", "assets/bonus_vacuum.json", "assets/bonus_vacuum.webp", "assets/bonus_whisky.json", "assets/bonus_whisky.webp", "assets/card25.webp", "assets/card26.webp", "assets/card27.webp", "assets/card28.webp", "assets/card29.webp", "assets/card30.webp", "assets/card31.webp", "assets/crown.json", "assets/crown.png", "assets/env_closed.png", "assets/env_open.png", "assets/env_today.png", "assets/game25.json", "assets/game25.webp", "assets/game25_bg.webp", "assets/game26.json", "assets/game26.webp", "assets/game27.json", "assets/game27.webp", "assets/game28_bg.webp", "assets/game28_cat.webp", "assets/game28_food.json", "assets/game28_food.webp", "assets/game28_items.json", "assets/game28_items.webp", "assets/game29.json", "assets/game29.webp", "assets/game30.json", "assets/game30.webp", "assets/game31.json", "assets/game31.webp", "assets/gifts.bin", "assets/gifts.json", "assets/icon192.png", "assets/icon512.png", "assets/room.webp", "assets/sprites.json", "assets/whisky.webp", "assets/whisky_talk.png", "assets/fonts/OFL-Caveat.txt", "assets/fonts/OFL-Neucha.txt", "assets/fonts/OFL-PressStart2P.txt", "assets/fonts/OFL-Rubik.txt", "assets/fonts/caveat.woff", "assets/fonts/neucha.woff", "assets/fonts/pressstart.woff", "assets/fonts/rubik.woff"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("viski-") && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(V);
    const cached = (await cache.match(req, { ignoreSearch: true })) || (req.mode === "navigate" ? await cache.match("index.html") : undefined);
    // мимо HTTP-кеша браузера: новая версия видна сразу после публикации
    const net = fetch(req.mode === "navigate" ? req.url : req, { cache: "no-cache" }).then((r) => { if (r && r.ok && r.type === "basic") cache.put(req, r.clone()).catch(() => {}); return r; });
    if (!cached) return net;
    const late = new Promise((res) => setTimeout(() => res(cached), 3000));
    return Promise.race([net.catch(() => cached), late]);
  })());
});
