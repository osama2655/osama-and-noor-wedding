// Shell-only cache. The API is always network (never cached) so shared data stays fresh.
const CACHE = 'wedding-shell-v7'
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/layout.css',
  './css/dashboard.css',
  './css/facts.css',
  './css/checklist.css',
  './css/vendors.css',
  './css/guests.css',
  './css/catalog.css',
  './css/drawer.css',
  './css/embeds.css',
  './css/notes.css',
  './css/dates.css',
  './css/boards.css',
  './css/invite.css',
  './css/attribution.css',
  './css/login.css',
  './css/themes.css',
  './js/main.js',
  './js/api.js',
  './js/store.js',
  './js/util.js',
  './js/content.js',
  './js/stats.js',
  './js/theme.js',
  './js/countdown.js',
  './js/auth.js',
  './js/dashboard.js',
  './js/facts.js',
  './js/checklist.js',
  './js/lanes.js',
  './js/vendors.js',
  './js/guests.js',
  './js/catalog.js',
  './js/drawer.js',
  './js/embeds.js',
  './js/saves.js',
  './js/favorites.js',
  './js/notes.js',
  './js/dates.js',
  './js/boards.js',
  './js/invite.js',
  './js/qr.js',
  './js/scanner.js',
  './js/vendor/qrcode.js',
  './js/resources.js',
  './js/sync.js',
  './js/themes.js',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.pathname.includes('/api/')) return // never cache API
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches
          .open(CACHE)
          .then((c) => c.put(e.request, copy))
          .catch(() => {})
        return res
      })
      .catch(() => caches.match(e.request)),
  )
})
