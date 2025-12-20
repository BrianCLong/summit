'use client';

import {useEffect, useState} from 'react';
import {
  registerServiceWorker,
  initializeBeforeInstallPrompt,
  showInstallPrompt,
  canShowInstallPrompt,
  skipWaiting,
  isOnline as checkIsOnline,
  onNetworkStatusChange,
} from '../lib/pwa-utils';

export function PWAManager() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Register service worker
    registerServiceWorker();

    // Initialize install prompt
    initializeBeforeInstallPrompt();

    // Check initial online status
    setIsOnline(checkIsOnline());

    // Listen for service worker updates
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    // Listen for installable event
    const handleInstallable = () => {
      setInstallable(true);
    };

    // Listen for network status changes
    const cleanupNetworkListener = onNetworkStatusChange((online) => {
      setIsOnline(online);
    });

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-installable', handleInstallable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-installable', handleInstallable);
      cleanupNetworkListener();
    };
  }, []);

  const handleUpdate = () => {
    skipWaiting();
    window.location.reload();
  };

  const handleInstall = async () => {
    const accepted = await showInstallPrompt();
    if (accepted) {
      setInstallable(false);
    }
  };

  return (
    <>
      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-blue-600 p-4 text-white shadow-lg">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="font-semibold">Update Available</h3>
              <p className="mt-1 text-sm">A new version of IntelGraph is available.</p>
            </div>
            <button
              onClick={handleUpdate}
              className="ml-4 rounded bg-white px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50">
              Update
            </button>
          </div>
        </div>
      )}

      {/* Install prompt */}
      {installable && canShowInstallPrompt() && (
        <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg bg-purple-600 p-4 text-white shadow-lg">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="font-semibold">Install IntelGraph</h3>
              <p className="mt-1 text-sm">
                Install the app for a better experience with offline access.
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="ml-4 rounded bg-white px-3 py-1 text-sm font-medium text-purple-600 hover:bg-purple-50">
              Install
            </button>
          </div>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-white">
          <div className="flex items-center justify-center">
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
            You're offline - Changes will sync when you're back online
          </div>
        </div>
      )}
    </>
  );
}
