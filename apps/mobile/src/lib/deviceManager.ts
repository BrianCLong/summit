/**
 * Device Manager Module
 * Handles device registration, binding, and security
 */
import { get, set, del } from 'idb-keyval';
import type { DeviceInfo } from '@/types';

const DEVICE_INFO_KEY = 'ig_device_info';

// Device fingerprinting (basic, non-invasive)
async function generateDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen info
  components.push(`${screen.width}x${screen.height}`);
  components.push(`${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Create hash of components
  const data = components.join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Device Manager API
export const deviceManager = {
  // Get stored device info
  async getDeviceInfo(): Promise<DeviceInfo | null> {
    try {
      const info = await get(DEVICE_INFO_KEY);
      return info as DeviceInfo | null;
    } catch {
      return null;
    }
  },

  // Save device info
  async saveDeviceInfo(info: DeviceInfo): Promise<void> {
    await set(DEVICE_INFO_KEY, info);
  },

  // Clear device info
  async clearDeviceInfo(): Promise<void> {
    await del(DEVICE_INFO_KEY);
  },

  // Get device fingerprint
  async getFingerprint(): Promise<string> {
    return generateDeviceFingerprint();
  },

  // Verify device binding (ensure fingerprint matches registered device)
  async verifyDeviceBinding(storedFingerprint: string): Promise<boolean> {
    const currentFingerprint = await generateDeviceFingerprint();
    return currentFingerprint === storedFingerprint;
  },

  // Update last active timestamp
  async updateLastActive(): Promise<void> {
    const info = await this.getDeviceInfo();
    if (info) {
      info.lastActiveAt = new Date().toISOString();
      await this.saveDeviceInfo(info);
    }
  },

  // Check if running in secure context
  isSecureContext(): boolean {
    return window.isSecureContext;
  },

  // Check if running as installed PWA
  isInstalledPWA(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    );
  },

  // Request persistent storage
  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      return await navigator.storage.persist();
    }
    return false;
  },

  // Get storage estimate
  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return null;
  },
};

export default deviceManager;
