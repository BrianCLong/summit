"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deviceManager = void 0;
/**
 * Device Manager Module
 * Handles device registration, binding, and security
 */
const idb_keyval_1 = require("idb-keyval");
const DEVICE_INFO_KEY = 'ig_device_info';
// Device fingerprinting (basic, non-invasive)
async function generateDeviceFingerprint() {
    const components = [];
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
exports.deviceManager = {
    // Get stored device info
    async getDeviceInfo() {
        try {
            const info = await (0, idb_keyval_1.get)(DEVICE_INFO_KEY);
            return info;
        }
        catch {
            return null;
        }
    },
    // Save device info
    async saveDeviceInfo(info) {
        await (0, idb_keyval_1.set)(DEVICE_INFO_KEY, info);
    },
    // Clear device info
    async clearDeviceInfo() {
        await (0, idb_keyval_1.del)(DEVICE_INFO_KEY);
    },
    // Get device fingerprint
    async getFingerprint() {
        return generateDeviceFingerprint();
    },
    // Verify device binding (ensure fingerprint matches registered device)
    async verifyDeviceBinding(storedFingerprint) {
        const currentFingerprint = await generateDeviceFingerprint();
        return currentFingerprint === storedFingerprint;
    },
    // Update last active timestamp
    async updateLastActive() {
        const info = await this.getDeviceInfo();
        if (info) {
            info.lastActiveAt = new Date().toISOString();
            await this.saveDeviceInfo(info);
        }
    },
    // Check if running in secure context
    isSecureContext() {
        return window.isSecureContext;
    },
    // Check if running as installed PWA
    isInstalledPWA() {
        return (window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone ===
                true);
    },
    // Request persistent storage
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            return await navigator.storage.persist();
        }
        return false;
    },
    // Get storage estimate
    async getStorageEstimate() {
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
exports.default = exports.deviceManager;
