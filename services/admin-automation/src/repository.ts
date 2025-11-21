import type { CitizenProfile, ServiceNeed, WorkloadMetrics } from './types.js';
import { ProfileCache } from './cache.js';
import { DatabaseError, CitizenNotFoundError } from './errors.js';

/**
 * Repository interface for citizen profile persistence.
 * Implementations can use PostgreSQL, Redis, or other stores.
 */
export interface ICitizenProfileRepository {
  findById(id: string): Promise<CitizenProfile | null>;
  findByIdentifier(type: string, value: string): Promise<CitizenProfile | null>;
  save(profile: CitizenProfile): Promise<CitizenProfile>;
  delete(id: string): Promise<boolean>;
  findAll(options?: { limit?: number; offset?: number }): Promise<CitizenProfile[]>;
}

export interface IServiceNeedRepository {
  findById(id: string): Promise<ServiceNeed | null>;
  findByCitizenId(citizenId: string): Promise<ServiceNeed[]>;
  save(need: ServiceNeed): Promise<ServiceNeed>;
  updateStatus(id: string, status: ServiceNeed['status']): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export interface IMetricsRepository {
  save(metrics: WorkloadMetrics): Promise<void>;
  findByPeriod(period: string): Promise<WorkloadMetrics | null>;
  findByDateRange(start: string, end: string): Promise<WorkloadMetrics[]>;
}

/**
 * In-memory implementation with caching for development/testing.
 * Replace with PostgreSQL implementation for production.
 */
export class InMemoryCitizenProfileRepository implements ICitizenProfileRepository {
  private store: Map<string, CitizenProfile> = new Map();
  private cache: ProfileCache<CitizenProfile>;

  constructor() {
    this.cache = new ProfileCache({ maxSize: 500, ttlSeconds: 300 });
  }

  async findById(id: string): Promise<CitizenProfile | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) return cached;

    const profile = this.store.get(id) || null;
    if (profile) this.cache.set(id, profile);

    return profile;
  }

  async findByIdentifier(type: string, value: string): Promise<CitizenProfile | null> {
    for (const profile of this.store.values()) {
      if (type === 'email' && profile.contact.email === value) return profile;
      if (type === 'ssn' && profile.identifiers.ssn === value) return profile;
      if (type === 'phone' && profile.contact.phone === value) return profile;
    }
    return null;
  }

  async save(profile: CitizenProfile): Promise<CitizenProfile> {
    this.store.set(profile.id, profile);
    this.cache.set(profile.id, profile);
    return profile;
  }

  async delete(id: string): Promise<boolean> {
    this.cache.delete(id);
    return this.store.delete(id);
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<CitizenProfile[]> {
    const profiles = Array.from(this.store.values());
    const offset = options?.offset || 0;
    const limit = options?.limit || profiles.length;
    return profiles.slice(offset, offset + limit);
  }
}

export class InMemoryServiceNeedRepository implements IServiceNeedRepository {
  private store: Map<string, ServiceNeed> = new Map();

  async findById(id: string): Promise<ServiceNeed | null> {
    return this.store.get(id) || null;
  }

  async findByCitizenId(citizenId: string): Promise<ServiceNeed[]> {
    return Array.from(this.store.values()).filter(n => n.citizenId === citizenId);
  }

  async save(need: ServiceNeed): Promise<ServiceNeed> {
    this.store.set(need.id, need);
    return need;
  }

  async updateStatus(id: string, status: ServiceNeed['status']): Promise<void> {
    const need = this.store.get(id);
    if (need) {
      need.status = status;
      this.store.set(id, need);
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

export class InMemoryMetricsRepository implements IMetricsRepository {
  private store: Map<string, WorkloadMetrics> = new Map();

  async save(metrics: WorkloadMetrics): Promise<void> {
    this.store.set(metrics.period, metrics);
  }

  async findByPeriod(period: string): Promise<WorkloadMetrics | null> {
    return this.store.get(period) || null;
  }

  async findByDateRange(start: string, end: string): Promise<WorkloadMetrics[]> {
    return Array.from(this.store.values()).filter(
      m => m.period >= start && m.period <= end,
    );
  }
}
