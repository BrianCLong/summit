import { v4 as uuidv4 } from 'uuid';
import type {
  CitizenProfile,
  ServiceRecord,
  DataConsent,
  Eligibility,
  ServiceDomain,
} from '../schemas/citizen.js';

/**
 * CitizenDataStore - In-memory store for citizen data
 * In production, this would be backed by Neo4j for graph relationships
 * and PostgreSQL for transactional data
 */
export class CitizenDataStore {
  private citizens: Map<string, CitizenProfile> = new Map();
  private nationalIdIndex: Map<string, string> = new Map();
  private serviceRecords: Map<string, ServiceRecord[]> = new Map();
  private consents: Map<string, DataConsent[]> = new Map();
  private eligibilities: Map<string, Eligibility[]> = new Map();

  /**
   * Ingest citizen data once - the core principle of the service
   * Deduplicates by nationalId to prevent redundant data entry
   */
  async ingestCitizen(data: Omit<CitizenProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<CitizenProfile> {
    // Check for existing citizen by nationalId
    const existingId = this.nationalIdIndex.get(data.nationalId);
    if (existingId) {
      return this.updateCitizen(existingId, data);
    }

    const now = new Date().toISOString();
    const citizen: CitizenProfile = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    this.citizens.set(citizen.id, citizen);
    this.nationalIdIndex.set(citizen.nationalId, citizen.id);
    this.serviceRecords.set(citizen.id, []);
    this.consents.set(citizen.id, []);
    this.eligibilities.set(citizen.id, []);

    return citizen;
  }

  /**
   * Update existing citizen profile
   */
  async updateCitizen(
    id: string,
    data: Partial<Omit<CitizenProfile, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<CitizenProfile> {
    const existing = this.citizens.get(id);
    if (!existing) {
      throw new Error(`Citizen not found: ${id}`);
    }

    const updated: CitizenProfile = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.citizens.set(id, updated);
    return updated;
  }

  /**
   * Get citizen by ID - instant reuse across all services
   */
  async getCitizen(id: string): Promise<CitizenProfile | undefined> {
    return this.citizens.get(id);
  }

  /**
   * Find citizen by national ID
   */
  async findByNationalId(nationalId: string): Promise<CitizenProfile | undefined> {
    const id = this.nationalIdIndex.get(nationalId);
    return id ? this.citizens.get(id) : undefined;
  }

  /**
   * Record a service interaction
   */
  async addServiceRecord(record: Omit<ServiceRecord, 'id'>): Promise<ServiceRecord> {
    const fullRecord: ServiceRecord = {
      ...record,
      id: uuidv4(),
    };

    const records = this.serviceRecords.get(record.citizenId) || [];
    records.push(fullRecord);
    this.serviceRecords.set(record.citizenId, records);

    return fullRecord;
  }

  /**
   * Get all service records for a citizen across domains
   */
  async getServiceRecords(citizenId: string, domain?: ServiceDomain): Promise<ServiceRecord[]> {
    const records = this.serviceRecords.get(citizenId) || [];
    if (domain) {
      return records.filter((r) => r.domain === domain);
    }
    return records;
  }

  /**
   * Record data consent
   */
  async recordConsent(consent: DataConsent): Promise<void> {
    const consents = this.consents.get(consent.citizenId) || [];
    // Update or add consent for domain
    const idx = consents.findIndex((c) => c.domain === consent.domain);
    if (idx >= 0) {
      consents[idx] = consent;
    } else {
      consents.push(consent);
    }
    this.consents.set(consent.citizenId, consents);
  }

  /**
   * Check if citizen has consented to data sharing for a domain
   */
  async hasConsent(citizenId: string, domain: ServiceDomain): Promise<boolean> {
    const consents = this.consents.get(citizenId) || [];
    const consent = consents.find((c) => c.domain === domain);
    if (!consent) return false;
    if (!consent.consentGiven) return false;
    if (consent.expiryDate && new Date(consent.expiryDate) < new Date()) return false;
    return true;
  }

  /**
   * Store computed eligibility
   */
  async storeEligibility(eligibility: Eligibility): Promise<void> {
    const eligibilities = this.eligibilities.get(eligibility.citizenId) || [];
    eligibilities.push(eligibility);
    this.eligibilities.set(eligibility.citizenId, eligibilities);
  }

  /**
   * Get proactive service recommendations based on eligibility
   */
  async getEligibleServices(citizenId: string): Promise<Eligibility[]> {
    const eligibilities = this.eligibilities.get(citizenId) || [];
    const now = new Date();
    return eligibilities.filter(
      (e) => e.eligible && new Date(e.validUntil) > now
    );
  }

  /**
   * Get unified citizen view - all data consolidated
   */
  async getUnifiedView(citizenId: string): Promise<{
    profile: CitizenProfile | undefined;
    serviceHistory: ServiceRecord[];
    eligibleServices: Eligibility[];
    consents: DataConsent[];
  }> {
    return {
      profile: await this.getCitizen(citizenId),
      serviceHistory: await this.getServiceRecords(citizenId),
      eligibleServices: await this.getEligibleServices(citizenId),
      consents: this.consents.get(citizenId) || [],
    };
  }
}

// Singleton instance
export const citizenStore = new CitizenDataStore();
