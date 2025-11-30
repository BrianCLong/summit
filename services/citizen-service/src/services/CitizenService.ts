import { citizenStore, CitizenDataStore } from './CitizenDataStore.js';
import type {
  CitizenProfile,
  ServiceRecord,
  ServiceDomain,
  DataConsent,
  Eligibility,
} from '../schemas/citizen.js';

/**
 * CitizenService - Business logic for citizen-centric service automation
 *
 * Core principles:
 * 1. Ingest data ONCE - no repeated paperwork
 * 2. Instant reuse across all government services
 * 3. Proactive service delivery based on eligibility
 * 4. Consent-based data sharing
 */
export class CitizenService {
  constructor(private store: CitizenDataStore = citizenStore) {}

  /**
   * Register a new citizen or update existing
   * This is the single point of data ingestion
   */
  async registerCitizen(data: {
    nationalId: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | 'undisclosed';
    nationality?: string;
    contact?: {
      email?: string;
      phone?: string;
      address?: {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      };
    };
    source: string;
  }): Promise<CitizenProfile> {
    // Check if already exists
    const existing = await this.store.findByNationalId(data.nationalId);
    if (existing) {
      // Merge new data with existing
      return this.store.updateCitizen(existing.id, {
        ...data,
        verified: existing.verified,
        verificationDate: existing.verificationDate,
      });
    }

    return this.store.ingestCitizen({
      ...data,
      verified: false,
    });
  }

  /**
   * Request a government service
   * Automatically pulls citizen data - no repeated forms
   */
  async requestService(params: {
    citizenId: string;
    domain: ServiceDomain;
    serviceType: string;
    metadata?: Record<string, unknown>;
  }): Promise<ServiceRecord> {
    const citizen = await this.store.getCitizen(params.citizenId);
    if (!citizen) {
      throw new Error('Citizen not found');
    }

    // Check consent for the service domain
    const hasConsent = await this.store.hasConsent(params.citizenId, params.domain);
    if (!hasConsent) {
      throw new Error(`Consent required for ${params.domain} services`);
    }

    return this.store.addServiceRecord({
      citizenId: params.citizenId,
      domain: params.domain,
      serviceType: params.serviceType,
      status: 'pending',
      requestDate: new Date().toISOString(),
      metadata: params.metadata,
      linkedRecords: [],
    });
  }

  /**
   * Grant consent for data sharing with a service domain
   */
  async grantConsent(params: {
    citizenId: string;
    domain: ServiceDomain;
    scope: string[];
    expiryDays?: number;
  }): Promise<DataConsent> {
    const consent: DataConsent = {
      citizenId: params.citizenId,
      domain: params.domain,
      consentGiven: true,
      consentDate: new Date().toISOString(),
      expiryDate: params.expiryDays
        ? new Date(Date.now() + params.expiryDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      scope: params.scope,
    };

    await this.store.recordConsent(consent);
    return consent;
  }

  /**
   * Compute and store service eligibility for proactive delivery
   */
  async computeEligibility(params: {
    citizenId: string;
    domain: ServiceDomain;
    serviceType: string;
  }): Promise<Eligibility> {
    const citizen = await this.store.getCitizen(params.citizenId);
    if (!citizen) {
      throw new Error('Citizen not found');
    }

    // Example eligibility rules (would be more complex in production)
    const eligible = this.evaluateEligibility(citizen, params.domain, params.serviceType);

    const eligibility: Eligibility = {
      citizenId: params.citizenId,
      domain: params.domain,
      serviceType: params.serviceType,
      eligible: eligible.isEligible,
      reason: eligible.reason,
      computedAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    await this.store.storeEligibility(eligibility);
    return eligibility;
  }

  /**
   * Get unified citizen view for service delivery
   */
  async getUnifiedView(citizenId: string) {
    return this.store.getUnifiedView(citizenId);
  }

  /**
   * Get proactive service recommendations
   */
  async getRecommendations(citizenId: string): Promise<Eligibility[]> {
    return this.store.getEligibleServices(citizenId);
  }

  /**
   * Transfer data between service domains (with consent check)
   */
  async transferData(params: {
    citizenId: string;
    fromDomain: ServiceDomain;
    toDomain: ServiceDomain;
    dataFields: string[];
  }): Promise<{ success: boolean; message: string }> {
    const hasFromConsent = await this.store.hasConsent(params.citizenId, params.fromDomain);
    const hasToConsent = await this.store.hasConsent(params.citizenId, params.toDomain);

    if (!hasFromConsent || !hasToConsent) {
      return {
        success: false,
        message: 'Consent required for both source and destination domains',
      };
    }

    // In production, this would actually transfer/link records
    return {
      success: true,
      message: `Data fields [${params.dataFields.join(', ')}] shared between ${params.fromDomain} and ${params.toDomain}`,
    };
  }

  /**
   * Evaluate eligibility based on citizen profile and service requirements
   */
  private evaluateEligibility(
    citizen: CitizenProfile,
    domain: ServiceDomain,
    serviceType: string
  ): { isEligible: boolean; reason?: string } {
    // Simplified eligibility rules - in production these would be policy-driven
    switch (domain) {
      case 'education':
        return { isEligible: true, reason: 'Basic education services available to all citizens' };
      case 'healthcare':
        return { isEligible: citizen.verified, reason: citizen.verified ? 'Verified citizen' : 'Verification required' };
      case 'social_services':
        return { isEligible: citizen.verified, reason: 'Means-tested services require verification' };
      default:
        return { isEligible: true };
    }
  }
}

// Default service instance
export const citizenService = new CitizenService();
