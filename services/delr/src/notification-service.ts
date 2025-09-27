import { NotificationLog } from './notification-log';
import type { NormalizedPlan, NotificationEntry, PartnerNotification } from './types';

export class NotificationService {
  constructor(private readonly log: NotificationLog) {}

  notify(plan: NormalizedPlan, notifiedAt: string): NotificationEntry[] {
    const sorted: PartnerNotification[] = [...plan.partnerNotifications].sort((a, b) =>
      a.partnerId.localeCompare(b.partnerId)
    );

    for (const notification of sorted) {
      this.log.append({
        planId: plan.planId,
        datasetId: plan.datasetId,
        partnerId: notification.partnerId,
        contact: notification.contact,
        message: notification.message,
        notifiedAt
      });
    }

    return this.log.entriesForPlan(plan.planId);
  }
}
