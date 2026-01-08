import dayjs from "dayjs";
import { DealRegistration, PartnerSegment } from "./types";

const DEFAULT_EXPIRY_DAYS = 90;

export class DealRegistrationBook {
  private registrations: Map<string, DealRegistration[]> = new Map();

  register(
    partnerId: string,
    partnerSegment: PartnerSegment,
    tierScore: number,
    expiryDays = DEFAULT_EXPIRY_DAYS
  ): DealRegistration {
    const now = dayjs();
    const registration: DealRegistration = {
      partnerId,
      partnerSegment,
      tierScore,
      registeredAt: now.toDate(),
      expiresAt: now.add(expiryDays, "day").toDate(),
      status: "active",
      activityLog: [{ at: now.toDate(), description: "registered" }],
    };
    const entries = this.registrations.get(partnerId) ?? [];
    entries.push(registration);
    this.registrations.set(partnerId, entries);
    return registration;
  }

  recordActivity(
    partnerId: string,
    description: string,
    extensionDays = 30
  ): DealRegistration | undefined {
    const active = this.getActive(partnerId);
    if (!active) return undefined;
    const updated = { ...active };
    updated.activityLog = [...active.activityLog, { at: new Date(), description }];
    updated.expiresAt = dayjs(updated.expiresAt).add(extensionDays, "day").toDate();
    this.replace(partnerId, active, updated);
    return updated;
  }

  expireInactive(now = new Date()): DealRegistration[] {
    const expired: DealRegistration[] = [];
    for (const [partnerId, list] of this.registrations.entries()) {
      list.forEach((entry) => {
        if (entry.status === "active" && dayjs(now).isAfter(entry.expiresAt)) {
          entry.status = "expired";
          entry.activityLog.push({ at: now, description: "auto-expired" });
          expired.push(entry);
        }
      });
      this.registrations.set(partnerId, list);
    }
    return expired;
  }

  close(partnerId: string, reason: string): DealRegistration | undefined {
    const active = this.getActive(partnerId);
    if (!active) return undefined;
    active.status = "closed";
    active.activityLog.push({ at: new Date(), description: `closed: ${reason}` });
    return active;
  }

  resolveOwnership(conflicts: DealRegistration[]): DealRegistration | undefined {
    if (conflicts.length === 0) return undefined;
    const sorted = [...conflicts].sort((a, b) => {
      const tierPriority =
        this.segmentPriority(b.partnerSegment) - this.segmentPriority(a.partnerSegment);
      if (tierPriority !== 0) return tierPriority;
      return a.registeredAt.getTime() - b.registeredAt.getTime();
    });
    return sorted[0];
  }

  getActive(partnerId: string): DealRegistration | undefined {
    return (this.registrations.get(partnerId) ?? []).find((r) => r.status === "active");
  }

  private replace(partnerId: string, current: DealRegistration, updated: DealRegistration): void {
    const list = this.registrations.get(partnerId) ?? [];
    const idx = list.indexOf(current);
    if (idx >= 0) {
      list[idx] = updated;
      this.registrations.set(partnerId, list);
    }
  }

  private segmentPriority(segment: PartnerSegment): number {
    switch (segment) {
      case PartnerSegment.STRATEGIC:
        return 3;
      case PartnerSegment.GROWTH:
        return 2;
      default:
        return 1;
    }
  }
}
