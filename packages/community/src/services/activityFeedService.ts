import type { ActivityEvent, ActivityType } from '../types.js';
import { createId } from '../utils.js';
import { CommunityStore } from '../store.js';

export interface ActivityInput {
  readonly userId: string;
  readonly type: ActivityType;
  readonly summary: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class ActivityFeedService {
  public constructor(private readonly store: CommunityStore) {}

  public record(input: ActivityInput): ActivityEvent {
    const event: ActivityEvent = {
      id: createId('act'),
      userId: input.userId,
      type: input.type,
      summary: input.summary,
      createdAt: new Date(),
      metadata: { ...(input.metadata ?? {}) },
    };

    this.store.appendActivity(event);
    return event;
  }

  public getFeed(userId?: string): ActivityEvent[] {
    return this.store.listActivities(userId);
  }

  public getLatest(userId: string, limit: number): ActivityEvent[] {
    return this.store
      .listActivities(userId)
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, limit);
  }
}
