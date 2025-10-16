import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST || []);
registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate(),
);
registerRoute(
  ({ url }) => url.pathname.startsWith('/assets/'),
  new StaleWhileRevalidate(),
);
