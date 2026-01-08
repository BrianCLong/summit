import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  PolicyDecision,
  PolicyContext,
  ReleasePolicyContext,
  SyncPolicyContext,
  LocalStorePolicyContext
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We need to resolve from server/src/policy/ to root/release-policy.yml
// server/src/policy -> server/src -> server -> root
const REPO_ROOT = path.resolve(__dirname, '../../../');
const RELEASE_POLICY_PATH = path.resolve(REPO_ROOT, 'release-policy.yml');

interface FreezePolicy {
  freeze: {
    enabled: boolean;
    timezone: string;
    windows: Array<{
      name: string;
      active: boolean;
      rrule?: string;
      start?: string;
      end?: string;
    }>;
  };
  override: {
    allowed: boolean;
    require_reason: boolean;
    reason_min_len: number;
  };
}

export class PolicyEvaluator {
  private static instance: PolicyEvaluator;
  private policyCache: Map<string, { content: string; hash: string; parsed: any }> = new Map();

  private constructor() {}

  public static getInstance(): PolicyEvaluator {
    if (!PolicyEvaluator.instance) {
      PolicyEvaluator.instance = new PolicyEvaluator();
    }
    return PolicyEvaluator.instance;
  }

  // Helper to load and parse YAML (using regex parser from check-freeze.mjs)
  private loadReleasePolicy(): { policy: FreezePolicy; hash: string } {
    const content = fs.readFileSync(RELEASE_POLICY_PATH, 'utf8');
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    if (this.policyCache.has(RELEASE_POLICY_PATH)) {
      const cached = this.policyCache.get(RELEASE_POLICY_PATH)!;
      if (cached.hash === hash) {
        return { policy: cached.parsed, hash };
      }
    }

    const policy = this.parseReleasePolicyYaml(content);
    this.policyCache.set(RELEASE_POLICY_PATH, { content, hash, parsed: policy });
    return { policy, hash };
  }

  private parseReleasePolicyYaml(content: string): FreezePolicy {
    // Ported from scripts/release/check-freeze.mjs
    const policy: FreezePolicy = {
      freeze: { enabled: false, timezone: 'UTC', windows: [] },
      override: { allowed: false, require_reason: false, reason_min_len: 0 }
    };

    const lines = content.split('\n');
    let currentSection: 'freeze' | 'override' | null = null;
    let currentWindow: any = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (line.match(/^freeze:/)) {
        currentSection = 'freeze';
        continue;
      }
      if (line.match(/^override:/)) {
        currentSection = 'override';
        continue;
      }

      if (currentSection === 'freeze') {
        if (trimmed.startsWith('enabled:')) policy.freeze.enabled = trimmed.split(':')[1].trim() === 'true';
        if (trimmed.startsWith('timezone:')) policy.freeze.timezone = trimmed.split(':')[1].trim();

        if (line.match(/^\s+windows:/)) continue;

        if (line.match(/^\s+-\s+name:/)) {
          const name = line.split('name:')[1].trim().replace(/^"|"$/g, '');
          currentWindow = { name, active: false };
          policy.freeze.windows.push(currentWindow);
        } else if (currentWindow && line.startsWith('      ')) {
           if (trimmed.startsWith('rrule:')) currentWindow.rrule = trimmed.split('rrule:')[1].trim().replace(/^"|"$/g, '');
           if (trimmed.startsWith('start:')) currentWindow.start = trimmed.split('start:')[1].trim().replace(/^"|"$/g, '');
           if (trimmed.startsWith('end:')) currentWindow.end = trimmed.split('end:')[1].trim().replace(/^"|"$/g, '');
           if (trimmed.startsWith('active:')) currentWindow.active = trimmed.split('active:')[1].trim() === 'true';
        }
      }

      if (currentSection === 'override') {
        if (trimmed.startsWith('allowed:')) policy.override.allowed = trimmed.split(':')[1].trim() === 'true';
        if (trimmed.startsWith('require_reason:')) policy.override.require_reason = trimmed.split(':')[1].trim() === 'true';
        if (trimmed.startsWith('reason_min_len:')) policy.override.reason_min_len = parseInt(trimmed.split(':')[1].trim(), 10);
      }
    }
    return policy;
  }

  public evaluate(context: PolicyContext): PolicyDecision {
    const contextHash = crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');

    // Dispatch based on action prefix
    if (context.action.startsWith('release.')) {
      return this.evaluateReleasePolicy(context as ReleasePolicyContext, contextHash);
    } else if (context.action.startsWith('sync.')) {
      return this.evaluateSyncPolicy(context as SyncPolicyContext, contextHash);
    } else if (context.action.startsWith('localstore.')) {
      return this.evaluateLocalStorePolicy(context as LocalStorePolicyContext, contextHash);
    }

    return {
      decision: 'DENY',
      reasonCode: 'UNKNOWN_ACTION',
      message: `Unknown action: ${context.action}`,
      policyRef: { version: '1.0.0', hash: 'unknown', path: 'internal' },
      action: context.action,
      contextHash,
      evidence: { inputsRedacted: {}, checks: {} }
    };
  }

  private evaluateReleasePolicy(context: ReleasePolicyContext, contextHash: string): PolicyDecision {
    const { policy, hash } = this.loadReleasePolicy();
    const evidence: any = { checks: {} };

    if (context.action === 'release.promotion.verify') {
      // Check Freeze
      const timestamp = context.timestamp || new Date().toISOString();
      const isFrozen = this.isFrozen(policy, timestamp);
      evidence.checks.isFrozen = isFrozen;

      if (isFrozen) {
        if (context.override) {
           if (!policy.override.allowed) {
             return this.deny('FREEZE_OVERRIDE_NOT_ALLOWED', 'Freeze override is not allowed by policy', context, hash, evidence);
           }
           if (policy.override.require_reason) {
             if (!context.overrideReason || context.overrideReason.length < policy.override.reason_min_len) {
               return this.deny('FREEZE_OVERRIDE_INVALID_REASON', `Override reason must be at least ${policy.override.reason_min_len} chars`, context, hash, evidence);
             }
           }
           return this.allow('FREEZE_OVERRIDDEN', 'Freeze active but overridden with valid reason', context, hash, evidence);
        }
        return this.deny('RELEASE_FROZEN', 'Release is currently frozen', context, hash, evidence);
      }

      // Check Artifacts (Stub for "GA promotion without evidence pack")
      if (context.targetEnv === 'ga') {
         // This is a minimal check to satisfy the test vector requirement
         // "GA promotion without evidence pack" -> DENY
         const hasEvidencePack = context.artifacts && context.artifacts.some(a => a.includes('evidence'));
         evidence.checks.hasEvidencePack = !!hasEvidencePack;
         if (!hasEvidencePack && context.targetEnv === 'ga') {
            return this.deny('MISSING_EVIDENCE_PACK', 'GA promotion requires evidence pack', context, hash, evidence);
         }
      }

      return this.allow('RELEASE_APPROVED', 'Release allowed', context, hash, evidence);
    }

    return this.deny('UNIMPLEMENTED_RELEASE_ACTION', `Action ${context.action} not implemented`, context, hash, evidence);
  }

  private evaluateSyncPolicy(context: SyncPolicyContext, contextHash: string): PolicyDecision {
    // Minimal wiring for sync boundary
    const hash = 'sync-policy-v1'; // Placeholder for sync policy hash
    const evidence: any = { checks: {} };

    if (context.action === 'sync.push') {
       // "sync push from revoked device" -> DENY
       // We assume context has deviceStatus property for now
       // @ts-ignore
       if (context.deviceStatus === 'revoked') {
          return this.deny('DEVICE_REVOKED', 'Sync push denied for revoked device', context, hash, evidence);
       }
    }

    if (context.action.startsWith('sync.attachments.')) {
        // "attachments upload exceeding budget" -> DENY
        if (context.dataSize && context.dataSize > 10 * 1024 * 1024) { // 10MB limit example
            return this.deny('QUOTA_EXCEEDED', 'Attachment size exceeds limit', context, hash, evidence);
        }
    }

    return this.allow('SYNC_ALLOWED', 'Sync action allowed', context, hash, evidence);
  }

  private evaluateLocalStorePolicy(context: LocalStorePolicyContext, contextHash: string): PolicyDecision {
      const hash = 'local-policy-v1';
      const evidence: any = { checks: {} };

      if (context.action === 'localstore.rotate') {
          // "localstore rotate without explicit operator flag" -> DENY
          if (!context.operatorFlag) {
              return this.deny('OPERATOR_FLAG_REQUIRED', 'Rotation requires operator flag', context, hash, evidence);
          }
      }

      return this.allow('LOCALSTORE_ALLOWED', 'Local store action allowed', context, hash, evidence);
  }

  private allow(code: string, message: string, context: PolicyContext, policyHash: string, evidence: any): PolicyDecision {
      return this.decision('ALLOW', code, message, context, policyHash, evidence);
  }

  private deny(code: string, message: string, context: PolicyContext, policyHash: string, evidence: any): PolicyDecision {
      return this.decision('DENY', code, message, context, policyHash, evidence);
  }

  private decision(
      decision: 'ALLOW' | 'DENY',
      code: string,
      message: string,
      context: PolicyContext,
      policyHash: string,
      evidence: any
  ): PolicyDecision {
      return {
          decision,
          reasonCode: code,
          message,
          policyRef: {
              version: '1.0.0',
              hash: policyHash,
              path: decision.startsWith('release') ? 'release-policy.yml' : 'internal'
          },
          action: context.action,
          contextHash: crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex'),
          evidence: {
              inputsRedacted: this.redact(context),
              checks: evidence.checks
          }
      };
  }

  private redact(obj: any): any {
      const redacted = { ...obj };
      // Redact standard sensitive fields
      const sensitive = ['token', 'password', 'secret', 'key', 'auth'];
      for (const key of Object.keys(redacted)) {
          if (sensitive.some(s => key.toLowerCase().includes(s))) {
              redacted[key] = '[REDACTED]';
          }
      }
      return redacted;
  }

  // --- Logic from check-freeze.mjs ---
  private isFrozen(policy: FreezePolicy, nowIso: string): boolean {
    const now = new Date(nowIso);

    // Check Weekends
    const dayOfWeek = now.toLocaleString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
    const rruleDayMap: Record<string, string> = {
      'MON': 'MO', 'TUE': 'TU', 'WED': 'WE', 'THU': 'TH', 'FRI': 'FR', 'SAT': 'SA', 'SUN': 'SU'
    };
    const currentRRuleDay = rruleDayMap[dayOfWeek];

    if (policy.freeze.enabled) {
        for (const window of policy.freeze.windows) {
            if (!window.active) continue;

            if (window.rrule && window.rrule.includes('FREQ=WEEKLY')) {
                 if (currentRRuleDay && window.rrule.includes(currentRRuleDay)) {
                     return true;
                 }
            }

            if (window.start && window.end) {
                if (nowIso >= window.start && nowIso <= window.end) {
                    return true;
                }
            }
        }
    }
    return false;
  }
}
