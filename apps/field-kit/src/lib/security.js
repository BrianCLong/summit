"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityManager = void 0;
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
class SecurityManager {
    lastActivity = Date.now();
    isLocked = false;
    wipeListener = null;
    lockListener = null;
    constructor() {
        this.setupActivityListeners();
        this.startWipeCheck();
    }
    setupActivityListeners() {
        ['mousedown', 'keydown', 'touchstart'].forEach(event => {
            window.addEventListener(event, () => this.recordActivity());
        });
        setInterval(() => this.checkTimeout(), 1000);
    }
    recordActivity() {
        if (this.isLocked)
            return;
        this.lastActivity = Date.now();
    }
    checkTimeout() {
        if (this.isLocked)
            return;
        if (Date.now() - this.lastActivity > SESSION_TIMEOUT_MS) {
            this.lock();
        }
    }
    lock() {
        this.isLocked = true;
        if (this.lockListener)
            this.lockListener(true);
    }
    unlock(pin) {
        // Mock PIN check
        if (pin === '1234') {
            this.isLocked = false;
            this.lastActivity = Date.now();
            if (this.lockListener)
                this.lockListener(false);
            return true;
        }
        return false;
    }
    setLockListener(listener) {
        this.lockListener = listener;
    }
    // Simulate remote wipe check
    startWipeCheck() {
        setInterval(async () => {
            // In a real app, this would check an endpoint or a special flag in the sync response
            const shouldWipe = localStorage.getItem('__simulate_remote_wipe') === 'true';
            if (shouldWipe) {
                await this.wipeDevice();
            }
        }, 5000);
    }
    async wipeDevice() {
        console.warn('EXECUTING REMOTE WIPE');
        // Clear IndexedDB
        // Note: In a real app we would iterate all stores and clear them
        // For this demo we just rely on the storage abstraction if it had a clear method,
        // or manually delete the DB.
        try {
            const dbs = await window.indexedDB.databases();
            dbs.forEach(db => {
                if (db.name)
                    window.indexedDB.deleteDatabase(db.name);
            });
            localStorage.clear();
            sessionStorage.clear();
            if (this.wipeListener)
                this.wipeListener(true);
            window.location.reload();
        }
        catch (e) {
            console.error('Wipe failed', e);
        }
    }
    setWipeListener(listener) {
        this.wipeListener = listener;
    }
}
exports.securityManager = new SecurityManager();
