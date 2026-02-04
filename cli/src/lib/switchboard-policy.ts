/**
 * Switchboard Capsule Policy Gate
 */

import { CapsuleManifest, CapsuleWaiver, normalizeRelativePath } from './switchboard-capsule.js';

export type CapsulePolicyAction =
  | { type: 'exec'; command: string }
  | { type: 'read'; path: string }
  | { type: 'write'; path: string }
  | { type: 'network'; allow_network: boolean }
  | { type: 'secret'; secret_handle: string };

export interface CapsulePolicyDecision {
  allow: boolean;
  reason: string;
  waiver_token?: string;
  waiver_reason?: string;
}

function isExpired(waiver: CapsuleWaiver): boolean {
  if (!waiver.expires_at) {
    return false;
  }
  const expiry = Date.parse(waiver.expires_at);
  if (Number.isNaN(expiry)) {
    return true;
  }
  return Date.now() > expiry;
}

function matchesCommand(allowed: string[], command: string): boolean {
  return allowed.some((pattern) => {
    if (pattern.endsWith('*')) {
      return command.startsWith(pattern.slice(0, -1));
    }
    return pattern === command;
  });
}

function isPathAllowed(allowed: string[], candidate: string): boolean {
  const normalized = normalizeRelativePath(candidate);
  if (!normalized) {
    return false;
  }
  return allowed.some((allowedPath) => {
    const normalizedAllowed = normalizeRelativePath(allowedPath);
    if (!normalizedAllowed) {
      return false;
    }
    return normalized === normalizedAllowed || normalized.startsWith(`${normalizedAllowed}/`);
  });
}

export class CapsulePolicyGate {
  private manifest: CapsuleManifest;
  private waiverToken?: string;

  constructor(manifest: CapsuleManifest, waiverToken?: string) {
    this.manifest = manifest;
    this.waiverToken = waiverToken;
  }

  evaluate(action: CapsulePolicyAction): CapsulePolicyDecision {
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

  private evaluateBase(action: CapsulePolicyAction): CapsulePolicyDecision {
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

  private findWaiver(): CapsuleWaiver | undefined {
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
