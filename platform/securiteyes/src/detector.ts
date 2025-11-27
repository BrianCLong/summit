import { SuspiciousEvent } from './types.js';
import { randomUUID } from 'crypto';

export interface DetectionInput {
  eventType: string;
  userId?: string;
  ip?: string;
  count?: number;
  timestamp: Date;
}

export class DetectionEngine {
  run(input: DetectionInput): SuspiciousEvent[] {
    const events: SuspiciousEvent[] = [];

    // Rule 1: Excessive login failures
    if (input.eventType === 'LOGIN_FAILURE' && (input.count || 0) > 5) {
      events.push({
        id: randomUUID(),
        type: 'EXCESSIVE_LOGIN_FAILURES',
        severity: 'MEDIUM',
        timestamp: new Date(),
        source: input.ip || 'unknown',
        details: { count: input.count }
      });
    }

    // Rule 2: Unusual IP / Geo mismatch (Mocked logic)
    if (input.ip && input.ip.startsWith('192.168.99.')) { // Mock suspicious subnet
      events.push({
        id: randomUUID(),
        type: 'UNUSUAL_IP_SUBNET',
        severity: 'LOW',
        timestamp: new Date(),
        source: input.ip,
        details: { reason: 'Restricted subnet access attempt' }
      });
    }

    // Rule 3: High-frequency task creation
    if (input.eventType === 'TASK_CREATION' && (input.count || 0) > 20) {
      events.push({
        id: randomUUID(),
        type: 'HIGH_VELOCITY_TASK_CREATION',
        severity: 'HIGH',
        timestamp: new Date(),
        source: input.userId || 'system',
        details: { rate: '20+ per minute' }
      });
    }

    return events;
  }
}
