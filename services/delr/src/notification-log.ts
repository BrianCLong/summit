import type { NotificationEntry } from './types';

export class NotificationLog {
  private readonly entries: NotificationEntry[] = [];

  append(entry: NotificationEntry): void {
    this.entries.push(entry);
  }

  entriesForPlan(planId: string): NotificationEntry[] {
    return this.entries.filter((entry) => entry.planId === planId);
  }

  all(): NotificationEntry[] {
    return [...this.entries];
  }
}
