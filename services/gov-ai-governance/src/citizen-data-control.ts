/**
 * Citizen Data Control Service
 *
 * Provides citizens with full transparency and control over their data.
 * Implements GDPR-style rights for government AI systems.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CitizenConsent, DataAccessRequest } from './types.js';

export interface CitizenDataControlConfig {
  auditService?: { log: (event: unknown) => Promise<void> };
  consentStore?: Map<string, CitizenConsent[]>;
  requestStore?: Map<string, DataAccessRequest>;
}

export class CitizenDataControl {
  private consents: Map<string, CitizenConsent[]>;
  private requests: Map<string, DataAccessRequest>;
  private auditService?: { log: (event: unknown) => Promise<void> };

  constructor(config: CitizenDataControlConfig = {}) {
    this.consents = config.consentStore ?? new Map();
    this.requests = config.requestStore ?? new Map();
    this.auditService = config.auditService;
  }

  /**
   * Record citizen consent for data processing
   */
  async grantConsent(consent: Omit<CitizenConsent, 'consentTimestamp'>): Promise<CitizenConsent> {
    const fullConsent: CitizenConsent = {
      ...consent,
      consentTimestamp: new Date().toISOString(),
    };

    const existing = this.consents.get(consent.citizenId) ?? [];
    existing.push(fullConsent);
    this.consents.set(consent.citizenId, existing);

    await this.audit('consent_granted', consent.citizenId, { consent: fullConsent });
    return fullConsent;
  }

  /**
   * Withdraw previously granted consent
   */
  async withdrawConsent(
    citizenId: string,
    dataCategories: string[],
    purposes: string[],
  ): Promise<boolean> {
    const existing = this.consents.get(citizenId);
    if (!existing) return false;

    const updated = existing.filter(
      (c) =>
        !dataCategories.some((dc) => c.dataCategories.includes(dc as never)) ||
        !purposes.some((p) => c.purposes.includes(p as never)),
    );

    this.consents.set(citizenId, updated);
    await this.audit('consent_withdrawn', citizenId, { dataCategories, purposes });
    return true;
  }

  /**
   * Get all active consents for a citizen
   */
  async getConsents(citizenId: string): Promise<CitizenConsent[]> {
    const consents = this.consents.get(citizenId) ?? [];
    const now = new Date();

    return consents.filter((c) => {
      if (!c.expiresAt) return c.consentGiven;
      return c.consentGiven && new Date(c.expiresAt) > now;
    });
  }

  /**
   * Check if processing is allowed for given categories and purpose
   */
  async checkConsent(
    citizenId: string,
    dataCategory: string,
    purpose: string,
  ): Promise<{ allowed: boolean; basis: string }> {
    const consents = await this.getConsents(citizenId);

    const matching = consents.find(
      (c) =>
        c.dataCategories.includes(dataCategory as never) &&
        c.purposes.includes(purpose as never) &&
        c.consentGiven,
    );

    return {
      allowed: !!matching,
      basis: matching ? 'explicit_consent' : 'no_consent',
    };
  }

  /**
   * Submit a data access request (DSAR)
   */
  async submitAccessRequest(
    request: Omit<DataAccessRequest, 'requestId' | 'submittedAt' | 'status'>,
  ): Promise<DataAccessRequest> {
    const fullRequest: DataAccessRequest = {
      ...request,
      requestId: uuidv4(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    this.requests.set(fullRequest.requestId, fullRequest);
    await this.audit('data_access_request_submitted', request.citizenId, { request: fullRequest });
    return fullRequest;
  }

  /**
   * Get status of a data access request
   */
  async getRequestStatus(requestId: string): Promise<DataAccessRequest | null> {
    return this.requests.get(requestId) ?? null;
  }

  /**
   * Process and complete a data access request
   */
  async completeRequest(
    requestId: string,
    status: 'completed' | 'denied',
  ): Promise<DataAccessRequest | null> {
    const request = this.requests.get(requestId);
    if (!request) return null;

    const updated: DataAccessRequest = {
      ...request,
      status,
      completedAt: new Date().toISOString(),
    };

    this.requests.set(requestId, updated);
    await this.audit('data_access_request_completed', request.citizenId, { request: updated });
    return updated;
  }

  /**
   * Get all requests for a citizen
   */
  async getCitizenRequests(citizenId: string): Promise<DataAccessRequest[]> {
    return Array.from(this.requests.values()).filter((r) => r.citizenId === citizenId);
  }

  /**
   * Export all citizen data (portability)
   */
  async exportCitizenData(citizenId: string): Promise<{
    consents: CitizenConsent[];
    requests: DataAccessRequest[];
    exportedAt: string;
  }> {
    const data = {
      consents: await this.getConsents(citizenId),
      requests: await this.getCitizenRequests(citizenId),
      exportedAt: new Date().toISOString(),
    };

    await this.audit('data_exported', citizenId, { summary: `Exported ${data.consents.length} consents, ${data.requests.length} requests` });
    return data;
  }

  private async audit(eventType: string, citizenId: string, details: Record<string, unknown>): Promise<void> {
    if (this.auditService) {
      await this.auditService.log({
        eventType,
        actorId: citizenId,
        actorType: 'citizen',
        timestamp: new Date().toISOString(),
        details,
      });
    }
  }
}
