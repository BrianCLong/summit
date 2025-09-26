let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

export function registerOfflineServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then((registration) => {
      if (import.meta.env.DEV) {
        console.info('[Offline] Service worker registered:', registration.scope);
      }
      return registration;
    })
    .catch((error: Error) => {
      console.warn('[Offline] Service worker registration failed:', error);
      return null;
    });

  return registrationPromise;
}
