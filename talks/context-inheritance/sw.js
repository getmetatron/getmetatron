'use strict';
const CACHE = 'metatron-context-inheritance-20261011-v1';
const ROOT = new URL('./', self.location).href;
const FILES = ['', 'index.html', 'viewer.css', 'viewer.js', 'slides.js', 'context-inheritance-agenticdev-2026.pdf',
  ...Array.from({ length: 24 }, (_, i) => `slides/${String(i + 1).padStart(2, '0')}.webp`)].map(path => new URL(path, ROOT).href);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('metatron-context-inheritance-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_OFFLINE') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      const saved = await Promise.all(FILES.map(url => cache.match(url)));
      if (saved.every(Boolean)) event.source?.postMessage({ type: 'OFFLINE_READY' });
    })());
    return;
  }
  if (event.data?.type !== 'SAVE_OFFLINE') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(FILES);
      event.source?.postMessage({ type: 'OFFLINE_READY' });
    } catch { event.source?.postMessage({ type: 'OFFLINE_ERROR' }); }
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(ROOT)) return;
  event.respondWith((async () => {
    // Prefer fresh published files; use the complete saved copy when offline.
    try { return await fetch(event.request); }
    catch {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      throw new Error('This resource has not been saved offline.');
    }
  })());
});
