import dayjs from "dayjs";
import { ScorecardMetrics } from "./types";

export class PartnerScorecard {
  private metrics: Map<string, ScorecardMetrics> = new Map();

  upsert(partnerId: string, metrics: Omit<ScorecardMetrics, "updatedAt">): ScorecardMetrics {
    const merged: ScorecardMetrics = { ...metrics, updatedAt: new Date() };
    this.metrics.set(partnerId, merged);
    return merged;
  }

  get(partnerId: string): ScorecardMetrics | undefined {
    return this.metrics.get(partnerId);
  }

  isStale(partnerId: string, now = new Date()): boolean {
    const current = this.metrics.get(partnerId);
    if (!current) return true;
    return dayjs(now).diff(dayjs(current.updatedAt), "day") >= 7;
  }
}
