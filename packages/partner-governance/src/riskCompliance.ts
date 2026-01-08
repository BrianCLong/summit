import dayjs from "dayjs";
import {
  AccessGrant,
  EnforcementAction,
  HealthSignal,
  LeakageEvent,
  RiskRegisterEntry,
} from "./types";

export class RiskRegister {
  private entries: Map<string, RiskRegisterEntry> = new Map();

  upsert(entry: RiskRegisterEntry): void {
    this.entries.set(entry.partnerId, entry);
  }

  needsReview(partnerId: string, now = new Date()): boolean {
    const entry = this.entries.get(partnerId);
    if (!entry) return true;
    return dayjs(now).diff(dayjs(entry.lastReviewedAt), "day") >= 90;
  }
}

export class AccessReview {
  private grants: Map<string, AccessGrant> = new Map();

  issue(grant: AccessGrant): void {
    this.grants.set(grant.id, grant);
  }

  revokeExpired(now = new Date()): string[] {
    const revoked: string[] = [];
    for (const grant of this.grants.values()) {
      if (dayjs(now).isAfter(grant.expiresAt)) {
        this.grants.delete(grant.id);
        revoked.push(grant.id);
      }
    }
    return revoked;
  }

  listActive(partnerId: string, now = new Date()): AccessGrant[] {
    return Array.from(this.grants.values()).filter(
      (grant) => grant.partnerId === partnerId && dayjs(now).isBefore(grant.expiresAt)
    );
  }
}

export function detectLeakage(
  entitlements: { partnerId: string; apiQuotaPerMinute: number; activeUsers: number },
  usage: { partnerId: string; observedRate: number; userCount: number }
): LeakageEvent | null {
  if (usage.partnerId !== entitlements.partnerId) return null;
  if (usage.observedRate > entitlements.apiQuotaPerMinute * 1.1) {
    return {
      partnerId: usage.partnerId,
      reason: "Unmetered usage exceeding entitlement",
      detectedAt: new Date(),
    };
  }
  if (usage.userCount > entitlements.activeUsers * 1.2) {
    return {
      partnerId: usage.partnerId,
      reason: "Over-granted user access",
      detectedAt: new Date(),
    };
  }
  return null;
}

export function healthToEnforcement(signal: HealthSignal): EnforcementAction {
  if (signal.metric === "abuse" && signal.value >= signal.threshold * 2) {
    return "terminate";
  }
  if (signal.value >= signal.threshold * 1.5) {
    return "suspend";
  }
  if (signal.value >= signal.threshold) {
    return "throttle";
  }
  return "warn";
}
