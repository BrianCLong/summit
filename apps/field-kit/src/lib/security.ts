/**
 * Field Kit Security Manager
 *
 * ✅ SCAFFOLD ELIMINATED: Replaced hardcoded PIN with secure hashed PIN storage
 */

import { createHash } from 'crypto';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const PIN_STORAGE_KEY = '__field_kit_pin_hash';
const PIN_SALT_KEY = '__field_kit_pin_salt';

/**
 * Feature gate for demo mode
 * When enabled, allows using demo PIN
 */
const DEMO_MODE = process.env.FIELD_KIT_DEMO_MODE === 'true';

/**
 * Security configuration
 */
interface SecurityConfig {
  sessionTimeoutMs?: number;
  requireStrongPin?: boolean;
  minPinLength?: number;
  maxFailedAttempts?: number;
}

/**
 * Hash a PIN with salt for secure storage
 */
function hashPin(pin: string, salt: string): string {
  return createHash('sha256')
    .update(pin + salt)
    .digest('hex');
}

/**
 * Generate a random salt
 */
function generateSalt(): string {
  // In browser environment, use crypto.getRandomValues
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for Node.js environment
  return createHash('sha256')
    .update(Math.random().toString() + Date.now().toString())
    .digest('hex')
    .substring(0, 32);
}

/**
 * Validate PIN strength
 */
function validatePinStrength(pin: string, requireStrong: boolean = true): {
  valid: boolean;
  reason?: string;
} {
  if (!pin || pin.length < 4) {
    return { valid: false, reason: 'PIN must be at least 4 digits' };
  }

  if (pin.length > 12) {
    return { valid: false, reason: 'PIN must be at most 12 digits' };
  }

  if (!/^\d+$/.test(pin)) {
    return { valid: false, reason: 'PIN must contain only digits' };
  }

  if (!requireStrong) {
    return { valid: true };
  }

  // Check for weak PINs (sequential, repeating, common)
  const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  if (weakPins.includes(pin)) {
    return { valid: false, reason: 'PIN is too common. Please choose a stronger PIN' };
  }

  // Check for sequential digits
  const isSequential = /^(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(pin);
  if (isSequential) {
    return { valid: false, reason: 'PIN contains sequential digits. Please choose a stronger PIN' };
  }

  // Check for all same digits
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, reason: 'PIN cannot be all the same digit. Please choose a stronger PIN' };
  }

  return { valid: true };
}

class SecurityManager {
  private lastActivity: number = Date.now();
  private isLocked: boolean = false;
  private wipeListener: ((wiped: boolean) => void) | null = null;
  private lockListener: ((locked: boolean) => void) | null = null;
  private failedAttempts: number = 0;
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      sessionTimeoutMs: config.sessionTimeoutMs || SESSION_TIMEOUT_MS,
      requireStrongPin: config.requireStrongPin !== false,
      minPinLength: config.minPinLength || 4,
      maxFailedAttempts: config.maxFailedAttempts || 5,
    };

    this.setupActivityListeners();
    this.startWipeCheck();

    // Show demo mode warning if enabled
    if (DEMO_MODE) {
      console.warn(
        '\n' +
        '╔════════════════════════════════════════════════════════════════╗\n' +
        '║  ⚠️  FIELD KIT DEMO MODE ENABLED                             ║\n' +
        '║                                                                ║\n' +
        '║  Demo PIN "1234" is available for testing.                   ║\n' +
        '║  DO NOT use in production!                                    ║\n' +
        '╚════════════════════════════════════════════════════════════════╝\n'
      );
    }
  }

  private setupActivityListeners() {
    if (typeof window === 'undefined') return;

    ['mousedown', 'keydown', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => this.recordActivity());
    });

    setInterval(() => this.checkTimeout(), 1000);
  }

  private recordActivity() {
    if (this.isLocked) return;
    this.lastActivity = Date.now();
  }

  private checkTimeout() {
    if (this.isLocked) return;
    if (Date.now() - this.lastActivity > (this.config.sessionTimeoutMs || SESSION_TIMEOUT_MS)) {
      this.lock();
    }
  }

  public lock() {
    this.isLocked = true;
    if (this.lockListener) this.lockListener(true);
  }

  /**
   * Setup a new PIN (first-time setup or reset)
   */
  public setupPin(pin: string): { success: boolean; error?: string } {
    // Validate PIN strength
    const validation = validatePinStrength(pin, this.config.requireStrongPin);
    if (!validation.valid) {
      return { success: false, error: validation.reason };
    }

    // Generate salt
    const salt = generateSalt();

    // Hash PIN
    const hashedPin = hashPin(pin, salt);

    // Store in localStorage (in production, use secure enclave/keychain)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PIN_STORAGE_KEY, hashedPin);
      localStorage.setItem(PIN_SALT_KEY, salt);
    }

    console.log('[FIELD-KIT] PIN configured successfully');
    return { success: true };
  }

  /**
   * Check if PIN is configured
   */
  public isPinConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(PIN_STORAGE_KEY) !== null;
  }

  /**
   * Unlock the field kit with PIN
   *
   * ✅ SECURITY FIX: Replaced hardcoded PIN '1234' with secure hashed PIN verification
   *
   * PREVIOUS VULNERABILITY (line 41):
   * - if (pin === '1234') // Hardcoded PIN!
   * - Comment admitted "Mock PIN check"
   * - Anyone with access to source code could unlock
   * - Same PIN for all field kits
   * - No protection for sensitive field data
   *
   * NEW SECURE APPROACH:
   * - PIN stored as salted SHA-256 hash
   * - Each device has unique salt
   * - Failed attempt tracking with lockout
   * - Strong PIN validation (no sequential, repeating, common PINs)
   * - Demo mode gated by environment variable
   */
  public unlock(pin: string): boolean {
    // Check for max failed attempts
    if (this.failedAttempts >= (this.config.maxFailedAttempts || 5)) {
      console.error('[FIELD-KIT] Too many failed PIN attempts. Device locked.');
      return false;
    }

    // Demo mode fallback (only if explicitly enabled)
    if (DEMO_MODE && pin === '1234') {
      console.warn('[FIELD-KIT] Unlocked using DEMO PIN (not secure!)');
      this.isLocked = false;
      this.lastActivity = Date.now();
      this.failedAttempts = 0;
      if (this.lockListener) this.lockListener(false);
      return true;
    }

    // Check if PIN is configured
    if (typeof window === 'undefined') {
      console.error('[FIELD-KIT] Cannot verify PIN: window not available');
      return false;
    }

    const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
    const salt = localStorage.getItem(PIN_SALT_KEY);

    if (!storedHash || !salt) {
      console.error('[FIELD-KIT] No PIN configured. Please set up PIN first.');
      return false;
    }

    // Verify PIN
    const inputHash = hashPin(pin, salt);

    if (inputHash === storedHash) {
      // Success - unlock device
      this.isLocked = false;
      this.lastActivity = Date.now();
      this.failedAttempts = 0;
      if (this.lockListener) this.lockListener(false);
      console.log('[FIELD-KIT] Unlocked successfully');
      return true;
    } else {
      // Failed attempt
      this.failedAttempts++;
      console.warn(
        `[FIELD-KIT] Invalid PIN. Attempt ${this.failedAttempts}/${this.config.maxFailedAttempts}`
      );

      if (this.failedAttempts >= (this.config.maxFailedAttempts || 5)) {
        console.error('[FIELD-KIT] Maximum failed attempts reached. Device locked.');
        // In production, trigger additional security measures
        // e.g., notify admin, trigger remote wipe, etc.
      }

      return false;
    }
  }

  /**
   * Reset failed attempt counter (admin/recovery function)
   */
  public resetFailedAttempts() {
    this.failedAttempts = 0;
    console.log('[FIELD-KIT] Failed attempt counter reset');
  }

  /**
   * Get current failed attempt count
   */
  public getFailedAttempts(): number {
    return this.failedAttempts;
  }

  public setLockListener(listener: (locked: boolean) => void) {
    this.lockListener = listener;
  }

  // Simulate remote wipe check
  private startWipeCheck() {
    if (typeof window === 'undefined') return;

    setInterval(async () => {
      // In a real app, this would check an endpoint or a special flag in the sync response
      const shouldWipe = localStorage.getItem('__simulate_remote_wipe') === 'true';
      if (shouldWipe) {
        await this.wipeDevice();
      }
    }, 5000);
  }

  private async wipeDevice() {
    console.warn('EXECUTING REMOTE WIPE');
    // Clear IndexedDB
    // Note: In a real app we would iterate all stores and clear them
    // For this demo we just rely on the storage abstraction if it had a clear method,
    // or manually delete the DB.
    try {
        if (typeof window !== 'undefined') {
          const dbs = await window.indexedDB.databases();
          dbs.forEach(db => {
              if (db.name) window.indexedDB.deleteDatabase(db.name);
          });
          localStorage.clear();
          sessionStorage.clear();
          if (this.wipeListener) this.wipeListener(true);
          window.location.reload();
        }
    } catch (e) {
        console.error('Wipe failed', e);
    }
  }

  public setWipeListener(listener: (wiped: boolean) => void) {
    this.wipeListener = listener;
  }
}

export const securityManager = new SecurityManager();

// Export for testing and manual setup
export { SecurityManager, validatePinStrength, hashPin, generateSalt };
