/**
 * @fileoverview Case SLA Timer Types
 *
 * Defines structures for Service Level Agreement (SLA) timers attached to cases.
 *
 * @module cases/sla/types
 */

export type SLAType =
  | 'RESPONSE_TIME' // Time to first response
  | 'RESOLUTION_TIME' // Time to close/resolve
  | 'UPDATE_FREQUENCY' // Max time between updates
  | 'APPROVAL_TIME'; // Time for an approval step

export type SLAStatus =
  | 'ACTIVE' // Timer is running
  | 'PAUSED' // Timer is paused (e.g. waiting for customer)
  | 'COMPLETED' // SLA met
  | 'BREACHED' // SLA missed
  | 'CANCELLED'; // SLA no longer applicable

export interface CaseSLATimer {
  slaId: string;
  caseId: string;
  tenantId: string;
  type: SLAType;
  name: string;

  // Timing
  startTime: string; // ISO Date
  deadline: string; // ISO Date
  completedAt?: string; // ISO Date

  // Status
  status: SLAStatus;

  // Configuration snapshots (for audit)
  targetDurationSeconds: number;

  // Metadata
  metadata: Record<string, unknown>;
}

export interface CreateSLATimerInput {
  caseId: string;
  tenantId: string;
  type: SLAType;
  name: string;
  targetDurationSeconds: number;
  metadata?: Record<string, unknown>;
}
