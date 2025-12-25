export interface Cohort {
  id: string;
  name: string;
  description?: string;
  criteria: CohortCriteria;
  windowDays: number; // Lookback window
}

export interface CohortCriteria {
    // Simplified query structure for MVP
    // e.g., "event_count > 5" for "export_report"
    eventType: string;
    metric: 'count' | 'sum_property';
    property?: string;
    operator: 'gt' | 'lt' | 'eq';
    value: number;
}

export interface CohortMember {
    hashedTenantId: string;
    hashedUserId: string;
    metricValue: number;
}

export interface CohortEvaluationResult {
    cohortId: string;
    timestamp: string;
    members: CohortMember[];
    totalCount: number;
}
