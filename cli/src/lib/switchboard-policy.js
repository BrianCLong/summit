"use strict";
/**
 * Switchboard Capsule Policy Gate
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapsulePolicyGate = void 0;
const switchboard_capsule_js_1 = require("./switchboard-capsule.js");
function isExpired(waiver) {
    if (!waiver.expires_at) {
        return false;
    }
    const expiry = Date.parse(waiver.expires_at);
    if (Number.isNaN(expiry)) {
        return true;
    }
    return Date.now() > expiry;
}
function matchesCommand(allowed, command) {
    return allowed.some((pattern) => {
        if (pattern.endsWith('*')) {
            return command.startsWith(pattern.slice(0, -1));
        }
        return pattern === command;
    });
}
function isPathAllowed(allowed, candidate) {
    const normalized = (0, switchboard_capsule_js_1.normalizeRelativePath)(candidate);
    if (!normalized) {
        return false;
    }
    return allowed.some((allowedPath) => {
        const normalizedAllowed = (0, switchboard_capsule_js_1.normalizeRelativePath)(allowedPath);
        if (!normalizedAllowed) {
            return false;
        }
        return normalized === normalizedAllowed || normalized.startsWith(`${normalizedAllowed}/`);
    });
}
class CapsulePolicyGate {
    manifest;
    waiverToken;
    constructor(manifest, waiverToken) {
        this.manifest = manifest;
        this.waiverToken = waiverToken;
    }
    evaluate(action) {
        const decision = this.evaluateBase(action);
        if (decision.allow) {
            return decision;
        }
        const waiver = this.findWaiver();
        if (waiver) {
            return {
                allow: true,
                reason: 'waiver-approved',
                waiver_token: waiver.token,
                waiver_reason: waiver.reason,
            };
        }
        return decision;
    }
    evaluateBase(action) {
        switch (action.type) {
            case 'exec':
                if (matchesCommand(this.manifest.allowed_commands, action.command)) {
                    return { allow: true, reason: 'command-allowlist' };
                }
                return { allow: false, reason: 'command-not-allowed' };
            case 'read':
                if (isPathAllowed(this.manifest.allowed_paths.read, action.path)) {
                    return { allow: true, reason: 'read-path-allowlist' };
                }
                return { allow: false, reason: 'read-path-denied' };
            case 'write':
                if (isPathAllowed(this.manifest.allowed_paths.write, action.path)) {
                    return { allow: true, reason: 'write-path-allowlist' };
                }
                return { allow: false, reason: 'write-path-denied' };
            case 'network':
                if (!action.allow_network) {
                    return { allow: true, reason: 'network-unused' };
                }
                if (this.manifest.network_mode === 'on') {
                    return { allow: true, reason: 'network-allowed' };
                }
                return { allow: false, reason: 'network-disabled' };
            case 'secret':
                if (this.manifest.secret_handles.includes(action.secret_handle)) {
                    return { allow: true, reason: 'secret-handle-allowlist' };
                }
                return { allow: false, reason: 'secret-handle-denied' };
            default:
                return { allow: false, reason: 'unknown-action' };
        }
    }
    findWaiver() {
        if (!this.waiverToken) {
            return undefined;
        }
        const waiver = this.manifest.waivers.find((item) => item.token === this.waiverToken);
        if (!waiver || isExpired(waiver)) {
            return undefined;
        }
        return waiver;
    }
}
exports.CapsulePolicyGate = CapsulePolicyGate;
