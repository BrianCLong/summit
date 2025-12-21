import { createHash } from 'node:crypto';

export type ExceptionStatus = 'active' | 'expired' | 'resolved';

export interface ExceptionRecord {
  id: string;
  policyId: string;
  owner: string;
  rationale: string;
  expiry: Date;
  compensatingControls: string[];
  createdAt: Date;
  updatedAt: Date;
  status: ExceptionStatus;
  ticketRef?: string;
}

export interface Incident {
  id: string;
  sourceException: string;
  openedAt: Date;
  severity: 'medium' | 'high' | 'critical';
  summary: string;
}

export class ExceptionRegistry {
  private readonly records = new Map<string, ExceptionRecord>();
  private incidents: Incident[] = [];

  add(record: Omit<ExceptionRecord, 'createdAt' | 'updatedAt' | 'status'>): ExceptionRecord {
    if (this.records.has(record.id)) {
      throw new Error(`Exception ${record.id} already exists`);
    }

    const normalized: ExceptionRecord = {
      ...record,
      compensatingControls: record.compensatingControls ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
    };

    this.records.set(record.id, normalized);
    return normalized;
  }

  list(): ExceptionRecord[] {
    return Array.from(this.records.values()).map((record) => ({ ...record }));
  }

  resolve(id: string, ticketRef?: string): ExceptionRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Exception ${id} not found`);
    }
    record.status = 'resolved';
    record.updatedAt = new Date();
    if (ticketRef) {
      record.ticketRef = ticketRef;
    }
    this.records.set(id, record);
    return { ...record };
  }

  extend(id: string, newExpiry: Date): ExceptionRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Exception ${id} not found`);
    }
    record.expiry = newExpiry;
    record.updatedAt = new Date();
    this.records.set(id, record);
    return { ...record };
  }

  expired(referenceDate = new Date()): ExceptionRecord[] {
    return this.list().filter(
      (record) => record.status === 'active' && record.expiry.getTime() <= referenceDate.getTime(),
    );
  }

  expiringWithin(days: number, referenceDate = new Date()): ExceptionRecord[] {
    const threshold = referenceDate.getTime() + days * 24 * 60 * 60 * 1000;
    return this.list().filter((record) => record.expiry.getTime() <= threshold);
  }

  enforceExpiry(referenceDate = new Date()): Incident[] {
    const newlyExpired = this.expired(referenceDate);
    const incidents: Incident[] = [];
    newlyExpired.forEach((record) => {
      const incident: Incident = {
        id: createHash('sha256')
          .update(`${record.id}-${record.expiry.toISOString()}`)
          .digest('hex')
          .slice(0, 12),
        sourceException: record.id,
        openedAt: referenceDate,
        severity: 'high',
        summary: `Exception ${record.id} expired and must be treated as an incident`,
      };
      record.status = 'expired';
      record.updatedAt = referenceDate;
      incidents.push(incident);
    });

    if (incidents.length > 0) {
      this.incidents = [...this.incidents, ...incidents];
    }
    return incidents;
  }

  active(): ExceptionRecord[] {
    return this.list().filter((record) => record.status === 'active');
  }

  getIncidents(): Incident[] {
    return [...this.incidents];
  }
}
