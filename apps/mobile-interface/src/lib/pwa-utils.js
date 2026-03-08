"use strict";
/**
 * PWA Utilities for IntelGraph Mobile Interface
 * Handles service worker registration, updates, and offline capabilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prefetchForOffline = exports.onNetworkStatusChange = exports.canShowInstallPrompt = exports.showInstallPrompt = exports.initializeBeforeInstallPrompt = exports.getStorageEstimate = exports.requestPersistentStorage = exports.formatCacheSize = exports.getCacheSize = exports.clearCaches = exports.cacheURLs = exports.skipWaiting = exports.updateServiceWorker = exports.unregisterServiceWorker = exports.registerServiceWorker = exports.isOnline = exports.isInstalledPWA = exports.canInstallPWA = void 0;
// Check if PWA can be installed
const canInstallPWA = () => {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
};
exports.canInstallPWA = canInstallPWA;
// Check if app is installed as PWA
const isInstalledPWA = () => {
    if (typeof window === 'undefined')
        return false;
    // Check display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    // Check if running in PWA on iOS
    const isIOSPWA = window.navigator.standalone === true;
    return isStandalone || isIOSPWA;
};
exports.isInstalledPWA = isInstalledPWA;
// Check if device is online
const isOnline = () => {
    if (typeof window === 'undefined')
        return true;
    return navigator.onLine;
};
exports.isOnline = isOnline;
// Register service worker
const registerServiceWorker = async () => {
    if (!(0, exports.canInstallPWA)()) {
        console.log('Service workers are not supported');
        return null;
    }
    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        console.log('Service Worker registered successfully:', registration);
        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker)
                return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('New service worker available');
                    notifyUpdateAvailable();
                }
            });
        });
        return registration;
    }
    catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
};
exports.registerServiceWorker = registerServiceWorker;
// Unregister service worker
const unregisterServiceWorker = async () => {
    if (!(0, exports.canInstallPWA)())
        return false;
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.unregister();
            console.log('Service Worker unregistered');
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Failed to unregister service worker:', error);
        return false;
    }
};
exports.unregisterServiceWorker = unregisterServiceWorker;
// Update service worker
const updateServiceWorker = async () => {
    if (!(0, exports.canInstallPWA)())
        return;
    try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            await registration.update();
            console.log('Service Worker updated');
        }
    }
    catch (error) {
        console.error('Failed to update service worker:', error);
    }
};
exports.updateServiceWorker = updateServiceWorker;
// Skip waiting and activate new service worker
const skipWaiting = () => {
    if (!(0, exports.canInstallPWA)())
        return;
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
};
exports.skipWaiting = skipWaiting;
// Notify user about available update
const notifyUpdateAvailable = () => {
    // Dispatch custom event
    const event = new CustomEvent('sw-update-available', {
        detail: { message: 'A new version is available!' },
    });
    window.dispatchEvent(event);
};
// Cache specific URLs
const cacheURLs = (urls) => {
    if (!(0, exports.canInstallPWA)())
        return;
    navigator.serviceWorker.controller?.postMessage({
        type: 'CACHE_URLS',
        payload: urls,
    });
};
exports.cacheURLs = cacheURLs;
// Clear all caches
const clearCaches = async () => {
    if (typeof window === 'undefined' || !('caches' in window))
        return;
    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => {
            if (cacheName !== 'offline-cache') {
                return caches.delete(cacheName);
            }
        }));
        console.log('All caches cleared');
    }
    catch (error) {
        console.error('Failed to clear caches:', error);
    }
};
exports.clearCaches = clearCaches;
// Get cache size
const getCacheSize = async () => {
    if (typeof window === 'undefined' || !('caches' in window))
        return 0;
    try {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
        }
        return totalSize;
    }
    catch (error) {
        console.error('Failed to calculate cache size:', error);
        return 0;
    }
};
exports.getCacheSize = getCacheSize;
// Format cache size
const formatCacheSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
exports.formatCacheSize = formatCacheSize;
// Request persistent storage
const requestPersistentStorage = async () => {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
        return false;
    }
    try {
        const isPersisted = await navigator.storage.persisted();
        if (isPersisted) {
            console.log('Storage is already persistent');
            return true;
        }
        const granted = await navigator.storage.persist();
        console.log(`Storage persistence ${granted ? 'granted' : 'denied'}`);
        return granted;
    }
    catch (error) {
        console.error('Failed to request persistent storage:', error);
        return false;
    }
};
exports.requestPersistentStorage = requestPersistentStorage;
// Get storage estimate
const getStorageEstimate = async () => {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
        return null;
    }
    try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;
        return { usage, quota, percentage };
    }
    catch (error) {
        console.error('Failed to get storage estimate:', error);
        return null;
    }
};
exports.getStorageEstimate = getStorageEstimate;
// Add to home screen prompt
let deferredPrompt = null;
const initializeBeforeInstallPrompt = () => {
    if (typeof window === 'undefined')
        return;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('App can be installed');
        // Dispatch custom event
        const event = new CustomEvent('pwa-installable');
        window.dispatchEvent(event);
    });
    window.addEventListener('appinstalled', () => {
        console.log('App installed successfully');
        deferredPrompt = null;
        // Dispatch custom event
        const event = new CustomEvent('pwa-installed');
        window.dispatchEvent(event);
    });
};
exports.initializeBeforeInstallPrompt = initializeBeforeInstallPrompt;
// Show install prompt
const showInstallPrompt = async () => {
    if (!deferredPrompt) {
        console.log('Install prompt not available');
        return false;
    }
    try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the install prompt`);
        deferredPrompt = null;
        return outcome === 'accepted';
    }
    catch (error) {
        console.error('Failed to show install prompt:', error);
        return false;
    }
};
exports.showInstallPrompt = showInstallPrompt;
// Check if install prompt is available
const canShowInstallPrompt = () => {
    return deferredPrompt !== null;
};
exports.canShowInstallPrompt = canShowInstallPrompt;
// Network status listeners
const onNetworkStatusChange = (callback) => {
    if (typeof window === 'undefined')
        return () => { };
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};
exports.onNetworkStatusChange = onNetworkStatusChange;
// Prefetch URLs for offline access
const prefetchForOffline = async (urls) => {
    if (typeof window === 'undefined' || !('caches' in window))
        return;
    try {
        const cache = await caches.open('prefetch-cache');
        await Promise.all(urls.map(async (url) => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    console.log('Prefetched:', url);
                }
            }
            catch (error) {
                console.error('Failed to prefetch:', url, error);
            }
        }));
    }
    catch (error) {
        console.error('Failed to prefetch URLs:', error);
    }
};
exports.prefetchForOffline = prefetchForOffline;
