const STATIC_CACHE = 'summit-static-v1';
const GRAPHQL_PATH_SUFFIX = '/graphql';
const PRECACHE_ROUTES = ['/', '/index.html', '/dashboard', '/graph', '/ingest/wizard'];

const DB_NAME = 'summit-offline';
const DB_VERSION = 1;
const RESOURCE_STORE = 'resources';
const MUTATION_STORE = 'mutations';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE_ROUTES.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch (error) {
            console.warn('[Offline] Failed to precache', url, error);
          }
        }),
      );
    })(),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('summit-static-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname.endsWith(GRAPHQL_PATH_SUFFIX)) {
    event.respondWith(handleGraphQLRequest(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE);
    return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error();
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    return Response.error();
  }
}

async function handleGraphQLRequest(request) {
  const body = await parseRequestBody(request.clone());
  const cacheKey = body ? createCacheKey(body) : null;

  try {
    const response = await fetch(request);
    if (cacheKey) {
      const clone = response.clone();
      const contentType = clone.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const payload = await clone.json();
          await putResource(cacheKey, payload);
          broadcastMessage('OFFLINE_DATA_SYNCED', { key: cacheKey, updatedAt: Date.now() });
        } catch (error) {
          console.warn('[Offline] Failed to cache GraphQL payload', error);
        }
      }
    }
    return response;
  } catch (networkError) {
    if (body && isMutation(body)) {
      const optimistic = createOptimisticResponse(body);
      await queueMutation(body);
      broadcastMessage('OFFLINE_MUTATION_QUEUED', { operationName: body.operationName });
      return new Response(JSON.stringify({ data: optimistic, extensions: { offlineQueued: true } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline': 'true',
        },
      });
    }

    if (cacheKey) {
      const cached = await getResource(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Offline': 'true',
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ errors: [{ message: 'Offline and no cached data available.' }] }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline': 'true',
        },
      },
    );
  }
}

function parseRequestBody(request) {
  return request
    .text()
    .then((text) => {
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        console.warn('[Offline] Failed to parse request body', error);
        return null;
      }
    })
    .catch(() => null);
}

function isMutation(body) {
  if (!body) return false;
  if (typeof body.query === 'string' && body.query.trim().startsWith('mutation')) {
    return true;
  }
  const knownMutations = new Set([
    'CreateInvestigation',
    'CreateEntity',
    'CreateRelationship',
    'StartCopilotRun',
  ]);
  return typeof body.operationName === 'string' && knownMutations.has(body.operationName);
}

function createCacheKey(body) {
  const operationName =
    body?.operationName || extractOperationName(body?.query) || body?.extensions?.persistedQuery?.sha256Hash || 'anonymous';
  const variables = body?.variables ? JSON.stringify(body.variables) : '{}';
  return `${operationName}:${variables}`;
}

function extractOperationName(query) {
  if (typeof query !== 'string') return null;
  const match = /(mutation|query)\s+(\w+)/.exec(query);
  return match ? match[2] : null;
}

function createOptimisticResponse(body) {
  const variables = body?.variables || {};
  const now = Date.now();
  switch (body?.operationName) {
    case 'CreateInvestigation':
      return {
        createInvestigation: {
          id: variables?.input?.id || `offline-investigation-${now}`,
          name: variables?.input?.name || 'Offline Investigation',
          description: variables?.input?.description || '',
          status: 'OFFLINE_PENDING',
          __offline: true,
        },
      };
    case 'CreateEntity':
      return {
        createEntity: {
          id: `offline-entity-${now}`,
          type: variables?.input?.type || 'UNKNOWN',
          name: variables?.input?.name || 'Offline Entity',
          canonicalId: variables?.input?.canonicalId || '',
          properties: variables?.input?.properties || {},
          __offline: true,
        },
      };
    case 'CreateRelationship':
      return {
        createRelationship: {
          id: `offline-rel-${now}`,
          type: variables?.input?.type || 'RELATED_TO',
          fromEntityId: variables?.input?.fromEntityId || 'offline-source',
          toEntityId: variables?.input?.toEntityId || 'offline-target',
          __offline: true,
        },
      };
    case 'StartCopilotRun':
      return {
        startCopilotRun: {
          id: `offline-run-${now}`,
          goalText: variables?.goalText || 'Offline goal',
          status: 'QUEUED_OFFLINE',
          __offline: true,
        },
      };
    default:
      return {};
  }
}

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(RESOURCE_STORE)) {
          db.createObjectStore(RESOURCE_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(MUTATION_STORE)) {
          db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function putResource(key, data) {
  const db = await getDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(RESOURCE_STORE, 'readwrite');
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(tx.error);
    tx.objectStore(RESOURCE_STORE).put({ key, data, updatedAt: Date.now() });
  });
}

async function getResource(key) {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RESOURCE_STORE, 'readonly');
    const request = tx.objectStore(RESOURCE_STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueMutation(body) {
  const db = await getDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = () => reject(tx.error);
    tx.objectStore(MUTATION_STORE).put({
      id: self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : `offline-mutation-${Date.now()}`,
      body,
      createdAt: Date.now(),
      attempts: 0,
    });
  });
}

function broadcastMessage(type, payload) {
  self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type, payload }));
  });
}
