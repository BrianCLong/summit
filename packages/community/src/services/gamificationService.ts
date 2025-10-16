import { CommunityStore } from '../store.js';
import type { BadgeDefinition, ContributionSummary } from '../types.js';
import { ContributionTracker } from './contributionTracker.js';
import { createId } from '../utils.js';

export interface AwardContext {
  readonly userId: string;
  readonly badgeId: string;
  readonly reason: string;
}

export class GamificationService {
  public constructor(
    private readonly store: CommunityStore,
    private readonly tracker: ContributionTracker,
  ) {}

  public registerBadge(
    input: Omit<BadgeDefinition, 'id'> & { readonly id?: string },
  ): BadgeDefinition {
    const badge: BadgeDefinition = {
      id: input.id ?? createId('bdg'),
      label: input.label,
      description: input.description,
      points: input.points,
      icon: input.icon,
      accessibilityLabel: input.accessibilityLabel,
      criteria: { ...input.criteria },
    };
    this.store.upsertBadge(badge);
    return badge;
  }

  public awardBadge(context: AwardContext): ContributionSummary {
    const badge = this.store.getBadge(context.badgeId);
    if (!badge) {
      throw new Error(`Unknown badge ${context.badgeId}`);
    }
    return this.tracker.addBadge(context.userId, badge.id, badge.points);
  }

  public awardPoints(userId: string, points: number): ContributionSummary {
    if (points <= 0) {
      return this.tracker.getSummary(userId);
    }
    return this.tracker.addPoints(userId, points);
  }

  public listBadges(): BadgeDefinition[] {
    return this.store.listBadges();
  }
}
