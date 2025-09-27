import type { EolPlan, NormalizedPlan, NormalizedPurgeScope, PartnerNotification } from './types';

const PLAN_ID_SEPARATOR = '#';

export function normalizePlan(plan: EolPlan): NormalizedPlan {
  validatePlan(plan);
  const normalizedScope: NormalizedPurgeScope = {
    caches: dedupeAndSort(plan.purgeScope.caches ?? []),
    indexes: dedupeAndSort(plan.purgeScope.indexes ?? []),
    features: dedupeAndSort(plan.purgeScope.features ?? []),
    exports: dedupeAndSort(plan.purgeScope.exports ?? [])
  };

  const successorDatasets = dedupeAndSort(plan.successorDatasets ?? []);
  const partnerNotifications: PartnerNotification[] = plan.partnerNotifications.map((notification) => ({
    partnerId: notification.partnerId.trim(),
    contact: notification.contact.trim(),
    message: notification.message.trim()
  }));

  const datasetId = plan.datasetId.trim();
  const lastUse = plan.lastUse;
  const planId = `${datasetId}${PLAN_ID_SEPARATOR}${lastUse}`;

  return {
    datasetId,
    lastUse,
    successorDatasets,
    purgeScope: normalizedScope,
    partnerNotifications,
    planId
  };
}

function validatePlan(plan: EolPlan): void {
  if (!plan.datasetId || plan.datasetId.trim().length === 0) {
    throw new Error('datasetId is required');
  }

  if (!plan.lastUse || Number.isNaN(Date.parse(plan.lastUse))) {
    throw new Error('lastUse must be a valid ISO-8601 date string');
  }

  if (!plan.purgeScope) {
    throw new Error('purgeScope is required');
  }

  const scopeTargets = [
    plan.purgeScope.caches ?? [],
    plan.purgeScope.indexes ?? [],
    plan.purgeScope.features ?? [],
    plan.purgeScope.exports ?? []
  ].flat();

  if (scopeTargets.length === 0) {
    throw new Error('purgeScope must include at least one target');
  }

  if (!Array.isArray(plan.partnerNotifications)) {
    throw new Error('partnerNotifications must be provided');
  }

  for (const notification of plan.partnerNotifications) {
    if (!notification.partnerId || !notification.contact || !notification.message) {
      throw new Error('partnerNotifications require partnerId, contact, and message');
    }
  }
}

function dedupeAndSort(values: string[]): string[] {
  const sanitized = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .sort();
  return sanitized.filter((value, index) => index === 0 || value !== sanitized[index - 1]);
}
