import { storage } from './storage';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

class SecurityManager {
  private lastActivity: number = Date.now();
  private isLocked: boolean = false;
  private wipeListener: ((wiped: boolean) => void) | null = null;
  private lockListener: ((locked: boolean) => void) | null = null;

  constructor() {
    this.setupActivityListeners();
    this.startWipeCheck();
  }

  private setupActivityListeners() {
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
    if (Date.now() - this.lastActivity > SESSION_TIMEOUT_MS) {
      this.lock();
    }
  }

  public lock() {
    this.isLocked = true;
    if (this.lockListener) this.lockListener(true);
  }

  public unlock(pin: string): boolean {
    // Mock PIN check
    if (pin === '1234') {
      this.isLocked = false;
      this.lastActivity = Date.now();
      if (this.lockListener) this.lockListener(false);
      return true;
    }
    return false;
  }

  public setLockListener(listener: (locked: boolean) => void) {
    this.lockListener = listener;
  }

  // Simulate remote wipe check
  private startWipeCheck() {
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
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
        localStorage.clear();
        sessionStorage.clear();
        if (this.wipeListener) this.wipeListener(true);
        window.location.reload();
    } catch (e) {
        console.error('Wipe failed', e);
    }
  }

  public setWipeListener(listener: (wiped: boolean) => void) {
    this.wipeListener = listener;
  }
}

export const securityManager = new SecurityManager();
