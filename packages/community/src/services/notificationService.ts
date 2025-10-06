import { CommunityStore } from '../store.js';
import type { Notification } from '../types.js';
import { createId } from '../utils.js';

export interface NotificationInput {
  readonly userId: string;
  readonly message: string;
  readonly link?: string;
  readonly priority?: 'low' | 'medium' | 'high';
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export class NotificationService {
  public constructor(private readonly store: CommunityStore) {}

  public notify(input: NotificationInput): Notification {
    const notification: Notification = {
      id: createId('ntf'),
      userId: input.userId,
      message: input.message,
      link: input.link ?? null,
      createdAt: new Date(),
      readAt: null,
      priority: input.priority ?? 'medium',
      metadata: { ...(input.metadata ?? {}) }
    };
    this.store.appendNotification(notification);
    return notification;
  }

  public markRead(userId: string, notificationId: string): Notification[] {
    const queue = this.store.listNotifications(userId).map((entry) =>
      entry.id === notificationId && entry.readAt === null
        ? { ...entry, readAt: new Date() }
        : entry
    );
    this.store.replaceNotifications(userId, queue);
    return queue;
  }

  public list(userId: string): Notification[] {
    return this.store.listNotifications(userId);
  }
}
