/**
 * Audit Service Integration
 *
 * Integrates with the platform's existing audit-log service for
 * enterprise-grade immutable audit trails.
 */

import crypto from 'crypto';
import type { AuditEvent } from './types.js';

export interface AuditServiceClient {
  append(event: AuditEvent): Promise<void>;
  query(filters: AuditQueryFilters): Promise<AuditEvent[]>;
  verifyIntegrity(): Promise<{ valid: boolean; chainLength: number }>;
}

export interface AuditQueryFilters {
  eventType?: string;
  actorId?: string;
  resourceType?: string;
  resourceId?: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

/**
 * HTTP client for external audit-log service
 */
export class HttpAuditClient implements AuditServiceClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async append(event: AuditEvent): Promise<void> {
    const response = await fetch(`${this.baseUrl}/audit/append`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Audit append failed: ${response.status}`);
    }
  }

  async query(filters: AuditQueryFilters): Promise<AuditEvent[]> {
    const params = new URLSearchParams();
    if (filters.eventType) params.set('eventType', filters.eventType);
    if (filters.actorId) params.set('actorId', filters.actorId);
    if (filters.resourceType) params.set('resourceType', filters.resourceType);
    if (filters.resourceId) params.set('resourceId', filters.resourceId);
    if (filters.startTime) params.set('startTime', filters.startTime.toISOString());
    if (filters.endTime) params.set('endTime', filters.endTime.toISOString());
    if (filters.limit) params.set('limit', String(filters.limit));

    const response = await fetch(`${this.baseUrl}/audit/query?${params}`, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Audit query failed: ${response.status}`);
    }

    return response.json();
  }

  async verifyIntegrity(): Promise<{ valid: boolean; chainLength: number }> {
    const response = await fetch(`${this.baseUrl}/audit/verify`, {
      headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Audit verify failed: ${response.status}`);
    }

    return response.json();
  }
}

/**
 * In-memory audit client for standalone operation or testing
 */
export class InMemoryAuditClient implements AuditServiceClient {
  private events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    // Verify hash chain
    if (this.events.length > 0) {
      const lastEvent = this.events[this.events.length - 1];
      if (event.previousHash !== lastEvent.currentHash) {
        throw new Error('Hash chain broken');
      }
    }
    this.events.push(event);
  }

  async query(filters: AuditQueryFilters): Promise<AuditEvent[]> {
    let results = [...this.events];

    if (filters.eventType) {
      results = results.filter((e) => e.eventType === filters.eventType);
    }
    if (filters.actorId) {
      results = results.filter((e) => e.actorId === filters.actorId);
    }
    if (filters.resourceType) {
      results = results.filter((e) => e.resourceType === filters.resourceType);
    }
    if (filters.resourceId) {
      results = results.filter((e) => e.resourceId === filters.resourceId);
    }
    if (filters.startTime) {
      results = results.filter((e) => new Date(e.timestamp) >= filters.startTime!);
    }
    if (filters.endTime) {
      results = results.filter((e) => new Date(e.timestamp) <= filters.endTime!);
    }

    return results.slice(0, filters.limit ?? 100);
  }

  async verifyIntegrity(): Promise<{ valid: boolean; chainLength: number }> {
    for (let i = 1; i < this.events.length; i++) {
      if (this.events[i].previousHash !== this.events[i - 1].currentHash) {
        return { valid: false, chainLength: this.events.length };
      }
    }
    return { valid: true, chainLength: this.events.length };
  }

  getEvents(): AuditEvent[] {
    return [...this.events];
  }
}

/**
 * Create audit event with hash chain
 */
export function createAuditEvent(
  data: Omit<AuditEvent, 'eventId' | 'timestamp' | 'previousHash' | 'currentHash'>,
  previousHash: string = '0'.repeat(64),
): AuditEvent {
  const eventId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const eventData = {
    ...data,
    eventId,
    timestamp,
    previousHash,
  };

  const currentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(eventData))
    .digest('hex');

  return {
    ...eventData,
    currentHash,
  } as AuditEvent;
}
