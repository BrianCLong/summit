/**
 * Cloud Governance Package
 * Security, access control, and compliance for lakehouse
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ name: 'cloud-governance' });

export enum AccessLevel {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  NONE = 'none'
}

export interface AccessPolicy {
  id: string;
  principal: string; // user or role
  resource: string; // table, database, etc.
  access: AccessLevel;
  conditions?: Record<string, any>;
  createdAt: Date;
  expiresAt?: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  principal: string;
  action: string;
  resource: string;
  status: 'success' | 'denied' | 'error';
  metadata: Record<string, any>;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  categories: string[];
  containsPII: boolean;
  retentionPeriod?: number; // days
}

export class GovernanceManager {
  private policies: Map<string, AccessPolicy>;
  private auditLogs: AuditLog[];
  private classifications: Map<string, DataClassification>;

  constructor() {
    this.policies = new Map();
    this.auditLogs = [];
    this.classifications = new Map();
  }

  async createPolicy(policy: Omit<AccessPolicy, 'id' | 'createdAt'>): Promise<AccessPolicy> {
    const fullPolicy: AccessPolicy = {
      ...policy,
      id: uuidv4(),
      createdAt: new Date()
    };

    this.policies.set(fullPolicy.id, fullPolicy);
    logger.info({ policyId: fullPolicy.id }, 'Access policy created');

    return fullPolicy;
  }

  async checkAccess(principal: string, resource: string, action: string): Promise<boolean> {
    for (const policy of this.policies.values()) {
      if (policy.principal === principal && this.matchesResource(policy.resource, resource)) {
        if (policy.expiresAt && policy.expiresAt < new Date()) {
          continue;
        }

        const hasAccess = this.evaluateAccess(policy.access, action);

        await this.logAccess(principal, action, resource, hasAccess ? 'success' : 'denied');

        return hasAccess;
      }
    }

    await this.logAccess(principal, action, resource, 'denied');
    return false;
  }

  private matchesResource(policyResource: string, requestedResource: string): boolean {
    // Support wildcards
    const pattern = policyResource.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(requestedResource);
  }

  private evaluateAccess(policyAccess: AccessLevel, action: string): boolean {
    const actionLevels: Record<string, AccessLevel> = {
      'read': AccessLevel.READ,
      'select': AccessLevel.READ,
      'write': AccessLevel.WRITE,
      'insert': AccessLevel.WRITE,
      'update': AccessLevel.WRITE,
      'delete': AccessLevel.ADMIN,
      'drop': AccessLevel.ADMIN
    };

    const requiredLevel = actionLevels[action.toLowerCase()] || AccessLevel.ADMIN;

    const levelHierarchy = [AccessLevel.NONE, AccessLevel.READ, AccessLevel.WRITE, AccessLevel.ADMIN];
    return levelHierarchy.indexOf(policyAccess) >= levelHierarchy.indexOf(requiredLevel);
  }

  private async logAccess(
    principal: string,
    action: string,
    resource: string,
    status: 'success' | 'denied' | 'error'
  ): Promise<void> {
    const log: AuditLog = {
      id: uuidv4(),
      timestamp: new Date(),
      principal,
      action,
      resource,
      status,
      metadata: {}
    };

    this.auditLogs.push(log);

    if (status === 'denied') {
      logger.warn({ log }, 'Access denied');
    }
  }

  async getAuditLogs(filters?: {
    principal?: string;
    resource?: string;
    startTime?: Date;
    endTime?: Date;
  }): Promise<AuditLog[]> {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.principal) {
        logs = logs.filter(l => l.principal === filters.principal);
      }
      if (filters.resource) {
        logs = logs.filter(l => l.resource === filters.resource);
      }
      if (filters.startTime) {
        logs = logs.filter(l => l.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        logs = logs.filter(l => l.timestamp <= filters.endTime!);
      }
    }

    return logs;
  }

  async classifyData(resource: string, classification: DataClassification): Promise<void> {
    this.classifications.set(resource, classification);
    logger.info({ resource, classification }, 'Data classification set');
  }

  async getClassification(resource: string): Promise<DataClassification | undefined> {
    return this.classifications.get(resource);
  }

  async detectPII(data: Record<string, any>): Promise<{
    containsPII: boolean;
    fields: string[];
  }> {
    const piiPatterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      ssn: /^\d{3}-\d{2}-\d{4}$/,
      phone: /^\+?[\d\s\-()]+$/,
      creditCard: /^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$/
    };

    const piiFields: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        for (const [type, pattern] of Object.entries(piiPatterns)) {
          if (pattern.test(value)) {
            piiFields.push(key);
            break;
          }
        }
      }
    }

    return {
      containsPII: piiFields.length > 0,
      fields: piiFields
    };
  }

  async maskData(data: Record<string, any>, fields: string[]): Promise<Record<string, any>> {
    const masked = { ...data };

    for (const field of fields) {
      if (masked[field] && typeof masked[field] === 'string') {
        const value = masked[field] as string;
        masked[field] = value.substring(0, 3) + '*'.repeat(value.length - 3);
      }
    }

    return masked;
  }
}

export * from './encryption.js';
export * from './compliance.js';
