/**
 * Security Measures
 * Implements additional security controls for the mobile app
 */

// Screenshot prevention (best-effort via CSS and events)
export function enableScreenshotPrevention(): void {
  // Prevent context menu (right-click)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Add no-select class to body
  document.body.classList.add('no-select');

  // Apply CSS to prevent screen capture on sensitive elements
  const style = document.createElement('style');
  style.textContent = `
    .sensitive-content {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }

    /* iOS Safari screen recording prevention (best effort) */
    @media screen {
      .sensitive-content {
        filter: blur(0);
      }
    }

    @media not screen {
      .sensitive-content {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Detect when app goes to background (potential screenshot)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Could trigger security overlay or blur
      document.body.classList.add('app-hidden');
    } else {
      document.body.classList.remove('app-hidden');
    }
  });

  // iOS-specific: Try to detect screen recording
  if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
    // Note: Can't actually prevent, but can log attempt
    console.log('[Security] Screen capture API detected');
  }
}

// Copy prevention
export function enableCopyPrevention(): void {
  // Prevent copy events on sensitive elements
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection();
    const selectedElement = selection?.anchorNode?.parentElement;

    if (selectedElement?.closest('.sensitive-content')) {
      e.preventDefault();
      // Could show warning
      console.log('[Security] Copy prevented on sensitive content');
    }
  });

  // Prevent cut events
  document.addEventListener('cut', (e) => {
    const selection = window.getSelection();
    const selectedElement = selection?.anchorNode?.parentElement;

    if (selectedElement?.closest('.sensitive-content')) {
      e.preventDefault();
    }
  });

  // Prevent drag on sensitive content
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target?.closest('.sensitive-content')) {
      e.preventDefault();
    }
  });
}

// Keyboard shortcut blocking
export function blockKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Block Print Screen (where supported)
    if (e.key === 'PrintScreen') {
      e.preventDefault();
    }

    // Block Ctrl/Cmd + P (Print)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
    }

    // Block Ctrl/Cmd + S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
    }

    // Block Ctrl/Cmd + Shift + S (Save As)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
      e.preventDefault();
    }

    // Block F12 (Dev Tools) in production
    if (e.key === 'F12' && import.meta.env.PROD) {
      e.preventDefault();
    }
  });
}

// Session timeout handler
export function setupSessionTimeout(
  timeoutMs: number,
  onTimeout: () => void
): () => void {
  let timeoutId: number;
  let lastActivity = Date.now();

  const resetTimeout = () => {
    lastActivity = Date.now();
  };

  const checkTimeout = () => {
    if (Date.now() - lastActivity >= timeoutMs) {
      onTimeout();
    }
  };

  // Track user activity
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
  events.forEach((event) => {
    document.addEventListener(event, resetTimeout, { passive: true });
  });

  // Check timeout periodically
  timeoutId = window.setInterval(checkTimeout, 30000); // Check every 30s

  // Return cleanup function
  return () => {
    window.clearInterval(timeoutId);
    events.forEach((event) => {
      document.removeEventListener(event, resetTimeout);
    });
  };
}

// Remote wipe handler
export async function handleRemoteWipe(): Promise<void> {
  console.log('[Security] Remote wipe initiated');

  // Clear all local storage
  localStorage.clear();
  sessionStorage.clear();

  // Clear IndexedDB databases
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
    }
  }

  // Clear service worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  // Unregister service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }

  // Redirect to login
  window.location.href = '/login?wiped=true';
}

// Device binding verification
export async function verifyDeviceBinding(): Promise<boolean> {
  const storedDeviceId = localStorage.getItem('device_id');
  if (!storedDeviceId) {
    return false;
  }

  // Generate current device fingerprint
  const components: string[] = [];
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  components.push(navigator.language);
  components.push(navigator.platform);
  components.push(String(navigator.hardwareConcurrency || 0));

  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const currentFingerprint = Array.from(new Uint8Array(hashBuffer))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Compare with stored (partial match for flexibility)
  const storedFingerprint = storedDeviceId.split('-').pop() || '';
  return currentFingerprint.startsWith(storedFingerprint.slice(0, 4));
}

// Initialize all security measures
export function initializeSecurityMeasures(config: {
  enableScreenshotPrevention?: boolean;
  enableCopyPrevention?: boolean;
  blockKeyboardShortcuts?: boolean;
  sessionTimeoutMs?: number;
  onSessionTimeout?: () => void;
}): () => void {
  const cleanupFns: (() => void)[] = [];

  if (config.enableScreenshotPrevention) {
    enableScreenshotPrevention();
  }

  if (config.enableCopyPrevention) {
    enableCopyPrevention();
  }

  if (config.blockKeyboardShortcuts) {
    blockKeyboardShortcuts();
  }

  if (config.sessionTimeoutMs && config.onSessionTimeout) {
    const cleanup = setupSessionTimeout(
      config.sessionTimeoutMs,
      config.onSessionTimeout
    );
    cleanupFns.push(cleanup);
  }

  // Return combined cleanup function
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}

export default {
  enableScreenshotPrevention,
  enableCopyPrevention,
  blockKeyboardShortcuts,
  setupSessionTimeout,
  handleRemoteWipe,
  verifyDeviceBinding,
  initializeSecurityMeasures,
};
