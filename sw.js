/*
PWA Service Worker file
Service Worker Documentation: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
 */

const cacheVersion = '1748483419';
let cacheName = 'ironCloud_Tracker_Cache_V' + cacheVersion;

// ----------------------------------------------------

async function send_message_to_client(msg) {
    console.log("[SW] send_message_to_client: " + msg);
    await self.clients.claim();
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage(msg);
    });
}

self.addEventListener("statechange", async () => {
    console.log("[SW] updatefound");
    // send message to client side
    await send_message_to_client("update");
});

// Call install Event
self.addEventListener('install', async () => {
    console.log('[SW] install');
    // delete old caches
    let cacheNames = await caches.keys();
    console.log("[SW] cacheNames: " + cacheNames);
    if (cacheNames !== undefined && cacheNames.length > 0) {
        cacheNames.forEach(cacheName => {
            console.log("[SW] old cache found, delete it: " + cacheName);
            caches.delete(cacheName);
        });
    }
    await self.skipWaiting();
});

// Call Activate Event
self.addEventListener('activate', async (event) => {
    console.log('[SW]: Activated');
    await self.clients.claim();
    // delete old caches
    let local_caches = await caches.keys()
    for (let cache of local_caches) {
        if (cache !== cacheName) {
            console.log("[SW] delete old cache: " + cache);
            await caches.delete(cache);
        }
    }
    // reload all pages
    await send_message_to_client('refresh');
});

// listen for messages from the client
self.addEventListener('message', (event) => {
    const trustedOrigins = ['https://www.example.com']; // Add trusted origins here
    if (trustedOrigins.includes(event.origin)) {
        console.log('[SW] message from trusted origin: ' + event.data);
    } else {
        console.warn('[SW] message from untrusted origin: ' + event.origin);
    }
});

//
const putInCache = async (request, response) => {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    console.log("[SW] cache request: " + request.url);
}

const cacheFirst = async (request) => {
    const responseFromCache = await caches.match(request);
    if (responseFromCache) {
        console.log('[SW]: returning from cache: ' + request.url);
        return responseFromCache;
    }
    // new request ----
    try {
        console.log('[SW]: no match in cache for {' + request.url + '}, need to fetch');
        const responseFromNetwork = await fetch(request);
        if (responseFromNetwork.ok) {
            await putInCache(request, responseFromNetwork.clone());
        }
        return responseFromNetwork;
    } catch (error) {
        console.log("[SW][ERROR] network error: " + request.url)
        console.error(error);
        // when even the fallback response is not available,
        // there is nothing we can do, but we must always
        // return a Response object
        let body = "network error";
        let options = {
            status: 408,
            headers: {'Content-Type': 'text/plain'},
        }
        return new Response(body, options);
    }
};
const do_cache = ["/sw.js", "/", "static/"];
self.addEventListener('fetch', async (event) => {
    if (event.request.method === "GET") {
        console.log('[SW]: --> GET req: ' + event.request.url);
        // check if request is for a page that should be cached
        for (let i = 0; i < do_cache.length; i++) {
            if (event.request.url.indexOf(do_cache[i]) > -1) {
                await event.respondWith(cacheFirst(event.request));
                return;
            }
        }
        console.log("[SW] fetching: " + event.request.url);
        await event.respondWith(fetch(event.request));
    } else { // POST Req -----
        console.log('[SW]: --> POST req: ' + event.request.url);
    }
});
