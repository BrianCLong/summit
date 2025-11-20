/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Precache manifest will be injected here
workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Background Sync for failed requests
const bgSyncPlugin = new workbox.backgroundSync.BackgroundSyncPlugin('apiQueue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({queue}) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('Background sync: Request succeeded', entry.request.url);
      } catch (error) {
        console.error('Background sync: Request failed', entry.request.url, error);
        await queue.unshiftRequest(entry);
        throw error;
      }
    }
  },
});

// Queue API mutations for background sync
workbox.routing.registerRoute(
  ({url, request}) =>
    (url.pathname.includes('/api/') || url.pathname.includes('/graphql')) &&
    request.method === 'POST',
  new workbox.strategies.NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
);

// Offline fallback page
const OFFLINE_PAGE = '/offline.html';
const FALLBACK_IMAGE = '/images/offline-placeholder.svg';

// Precache offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-cache').then((cache) => {
      return cache.addAll([OFFLINE_PAGE, FALLBACK_IMAGE]);
    })
  );
  self.skipWaiting();
});

// Serve offline page when network fails
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_PAGE);
      })
    );
  } else if (event.request.destination === 'image') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(FALLBACK_IMAGE);
      })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.payload;
    event.waitUntil(
      caches.open('dynamic-cache').then((cache) => {
        return cache.addAll(urlsToCache);
      })
    );
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== 'offline-cache') {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('Periodic sync: Syncing data...');
  // Implement data sync logic
  // This could sync with IndexedDB and send updates to server
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'IntelGraph';
  const options = {
    body: data.body || 'New intelligence update',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle action clicks in notifications
self.addEventListener('notificationclick', (event) => {
  if (event.action) {
    console.log('Notification action clicked:', event.action);
    // Handle specific actions
    switch (event.action) {
      case 'open':
        event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
        break;
      case 'dismiss':
        // Just close the notification
        break;
      default:
        break;
    }
  }
});

// IndexedDB sync queue
const DB_NAME = 'intelgraph-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-mutations';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {keyPath: 'id', autoIncrement: true});
      }
    };
  });
}

// Sync pending mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncPendingMutations());
  }
});

async function syncPendingMutations() {
  console.log('Syncing pending mutations...');

  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const mutations = await store.getAll();

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      });

      if (response.ok) {
        // Remove from queue
        const deleteTransaction = db.transaction(STORE_NAME, 'readwrite');
        const deleteStore = deleteTransaction.objectStore(STORE_NAME);
        await deleteStore.delete(mutation.id);
        console.log('Mutation synced successfully:', mutation.id);
      }
    } catch (error) {
      console.error('Failed to sync mutation:', mutation.id, error);
    }
  }
}

// Cache size management
async function manageCacheSize() {
  const cacheNames = await caches.keys();
  const maxCacheSize = 100 * 1024 * 1024; // 100 MB

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    let totalSize = 0;

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }

      if (totalSize > maxCacheSize) {
        await cache.delete(request);
        console.log('Cache size limit reached, deleted:', request.url);
      }
    }
  }
}

// Run cache management periodically
setInterval(manageCacheSize, 60 * 60 * 1000); // Every hour

console.log('Service Worker loaded successfully');
