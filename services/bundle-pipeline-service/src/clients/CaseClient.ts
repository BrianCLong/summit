/**
 * CaseClient - Client for interacting with the Case Service
 * Handles case access validation and case data retrieval
 */

import type { Logger } from 'pino';

export interface CaseAccessResult {
  allowed: boolean;
  reason?: string;
  permissions?: string[];
}

export interface CaseInfo {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: 'open' | 'active' | 'closed' | 'archived';
  compartment?: string;
  policyLabels: string[];
  legalHold: boolean;
  createdAt: string;
  createdBy: string;
  metadata: Record<string, unknown>;
}

export interface CaseEntitySummary {
  entityId: string;
  entityType: string;
  name: string;
  role: string;
  connectionCount: number;
  riskScore?: number;
}

export class CaseClient {
  private readonly baseUrl: string;
  private readonly logger: Logger;

  constructor(baseUrl: string, logger: Logger) {
    this.baseUrl = baseUrl;
    this.logger = logger.child({ client: 'CaseClient' });
  }

  /**
   * Validate user access to a case for a specific action
   */
  async validateCaseAccess(
    caseId: string,
    tenantId: string,
    userId: string,
    action: 'view' | 'edit' | 'export' | 'share' | 'archive',
  ): Promise<CaseAccessResult> {
    try {
      const response = await fetch(`${this.baseUrl}/cases/${caseId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId, action }),
      });

      if (response.ok) {
        return await response.json() as CaseAccessResult;
      }

      // Handle specific error cases
      if (response.status === 403) {
        return { allowed: false, reason: 'Access denied' };
      }
      if (response.status === 404) {
        return { allowed: false, reason: 'Case not found' };
      }
      if (response.status === 423) {
        return { allowed: false, reason: 'Case is under legal hold' };
      }

      return { allowed: false, reason: `Unexpected error: ${response.statusText}` };
    } catch (err) {
      this.logger.warn({ err, caseId, userId }, 'Failed to validate case access');
      // In development/offline mode, allow access
      if (process.env.NODE_ENV === 'development') {
        return { allowed: true, permissions: ['view', 'edit', 'export'] };
      }
      return { allowed: false, reason: 'Service unavailable' };
    }
  }

  /**
   * Get case information
   */
  async getCase(caseId: string, tenantId: string): Promise<CaseInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}/cases/${caseId}?tenantId=${tenantId}`);

      if (response.ok) {
        return await response.json() as CaseInfo;
      }

      if (response.status === 404) {
        return null;
      }

      throw new Error(`Failed to get case: ${response.statusText}`);
    } catch (err) {
      this.logger.warn({ err, caseId }, 'Failed to get case');
      return null;
    }
  }

  /**
   * Get entity summaries for a case
   */
  async getCaseEntitySummaries(caseId: string, tenantId: string): Promise<CaseEntitySummary[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/cases/${caseId}/entities?tenantId=${tenantId}`,
      );

      if (response.ok) {
        return await response.json() as CaseEntitySummary[];
      }

      return [];
    } catch (err) {
      this.logger.warn({ err, caseId }, 'Failed to get case entity summaries');
      return [];
    }
  }

  /**
   * Check if case has active legal hold
   */
  async checkLegalHold(caseId: string, tenantId: string): Promise<boolean> {
    try {
      const caseInfo = await this.getCase(caseId, tenantId);
      return caseInfo?.legalHold ?? false;
    } catch (err) {
      this.logger.warn({ err, caseId }, 'Failed to check legal hold');
      return false;
    }
  }

  /**
   * Record case access in audit log
   */
  async recordAccess(
    caseId: string,
    tenantId: string,
    userId: string,
    action: string,
    reason: string,
    legalBasis?: string,
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/cases/${caseId}/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          userId,
          action,
          reason,
          legalBasis,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      this.logger.error({ err, caseId, userId, action }, 'Failed to record case access');
    }
  }

  /**
   * Get case classification requirements
   */
  async getCaseClassificationRequirements(
    caseId: string,
    tenantId: string,
  ): Promise<{
    minClassification: string;
    requiredMarkings: string[];
    compartments: string[];
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/cases/${caseId}/classification?tenantId=${tenantId}`,
      );

      if (response.ok) {
        return await response.json();
      }

      // Default requirements
      return {
        minClassification: 'UNCLASSIFIED',
        requiredMarkings: [],
        compartments: [],
      };
    } catch (err) {
      this.logger.warn({ err, caseId }, 'Failed to get case classification requirements');
      return {
        minClassification: 'UNCLASSIFIED',
        requiredMarkings: [],
        compartments: [],
      };
    }
  }
}
