const CACHE_NAME = 'timer-app-v1';
const FILES = ['.','index.html','style.css','script.js','manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp=>{
    return caches.open(CACHE_NAME).then(cache=>{ cache.put(e.request, resp.clone()); return resp; });
  })).catch(()=>caches.match('index.html')));
});