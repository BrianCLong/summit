import type { AnalyticsSnapshot, ContributionSummary } from '../types.js';
import { AnalyticsService } from './analyticsService.js';
import { ContributionTracker } from './contributionTracker.js';

export interface DashboardSummary {
  readonly snapshot: AnalyticsSnapshot;
  readonly momentumScore: number;
  readonly leaders: readonly ContributionSummary[];
}

export class DashboardService {
  public constructor(
    private readonly analytics: AnalyticsService,
    private readonly tracker: ContributionTracker,
  ) {}

  public getSummary(): DashboardSummary {
    const snapshot = this.analytics.snapshot();
    const averagePoints = this.analytics.engagementScore();
    const retention = this.analytics.retentionRate();
    const momentumScore = Number(
      ((averagePoints + retention * 100) / 2).toFixed(2),
    );
    const leaders = this.tracker.listTopContributors(5);
    return { snapshot, momentumScore, leaders };
  }
}
