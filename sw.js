// Divine Converter — COI ServiceWorker
// Injecteert Cross-Origin-Opener-Policy en Cross-Origin-Embedder-Policy headers
// zodat SharedArrayBuffer (nodig voor ffmpeg.wasm) werkt op GitHub Pages

const CACHE = 'divine-converter-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Sla non-GET requests over
  if (e.request.method !== 'GET') return;
  // Sla chrome-extension en andere protocols over
  if (!e.request.url.startsWith('http')) return;
  // Sla only-if-cached requests over die niet same-origin zijn
  if (e.request.cache === 'only-if-cached' && e.request.mode !== 'same-origin') return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Laat fouten en opaque responses door
        if (!response || response.status === 0 || response.type === 'opaque') {
          return response;
        }

        // Kloon de headers en voeg COOP/COEP toe
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
        newHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch(() => fetch(e.request))
  );
});
