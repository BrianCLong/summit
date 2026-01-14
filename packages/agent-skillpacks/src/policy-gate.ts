import { minimatch } from 'minimatch';
import {
  type PolicyBreakGlass,
  type PolicyConfig,
  type GovernanceMode,
} from './types';

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  governedException?: string;
}

export function evaluatePolicy(
  toolName: string,
  policy: PolicyConfig | undefined,
  governanceMode: GovernanceMode,
): PolicyDecision {
  const baseAllow = policy?.allow ?? [];
  const baseDeny = policy?.deny ?? [];
  const envPolicy = policy?.environments?.[governanceMode] ?? {};
  const allowList = [...baseAllow, ...(envPolicy.allow ?? [])];
  const denyList = [...baseDeny, ...(envPolicy.deny ?? [])];

  if (matchesAny(toolName, denyList)) {
    const waiver = findBreakGlass(toolName, policy?.breakGlass ?? []);
    if (waiver) {
      return {
        allowed: true,
        reason: `Governed Exception: ${waiver.reason} (expires ${waiver.expiresAt}).`,
        governedException: `${toolName} waiver approved by ${waiver.approvedBy}`,
      };
    }
    return { allowed: false, reason: 'Denied by policy denylist.' };
  }

  if (allowList.length === 0) {
    if (governanceMode === 'ci') {
      return { allowed: false, reason: 'CI default deny: tool not allowlisted.' };
    }
    return { allowed: true, reason: 'No allowlist configured; permitted by default.' };
  }

  if (matchesAny(toolName, allowList)) {
    return { allowed: true, reason: 'Tool allowlisted by policy.' };
  }

  const waiver = findBreakGlass(toolName, policy?.breakGlass ?? []);
  if (waiver) {
    return {
      allowed: true,
      reason: `Governed Exception: ${waiver.reason} (expires ${waiver.expiresAt}).`,
      governedException: `${toolName} waiver approved by ${waiver.approvedBy}`,
    };
  }

  return { allowed: false, reason: 'Tool not allowlisted for this environment.' };
}

function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => minimatch(value, pattern));
}

function findBreakGlass(
  toolName: string,
  waivers: PolicyBreakGlass[],
): PolicyBreakGlass | undefined {
  const now = new Date();
  return waivers.find((waiver) => {
    if (!minimatch(toolName, waiver.tool)) {
      return false;
    }
    const expiresAt = new Date(waiver.expiresAt);
    return expiresAt.getTime() > now.getTime();
  });
}
