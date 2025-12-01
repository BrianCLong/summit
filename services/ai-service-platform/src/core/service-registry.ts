/**
 * Service Registry - Central catalog of all AI services
 */

import { v4 as uuid } from 'uuid';
import type { ServiceDefinition, Deployment } from '../types/index.js';

interface RegisteredService extends ServiceDefinition {
  id: string;
  deployments: Map<string, Deployment>;
  createdAt: Date;
  updatedAt: Date;
}

export class ServiceRegistry {
  private services: Map<string, RegisteredService> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    // In production, load from database
    this.initialized = true;
  }

  async register(definition: ServiceDefinition): Promise<RegisteredService> {
    const id = definition.id || uuid();
    const now = new Date();

    const service: RegisteredService = {
      ...definition,
      id,
      deployments: new Map(),
      createdAt: now,
      updatedAt: now,
    };

    this.services.set(id, service);
    return service;
  }

  async get(id: string): Promise<RegisteredService | undefined> {
    return this.services.get(id);
  }

  async getByName(name: string): Promise<RegisteredService | undefined> {
    for (const service of this.services.values()) {
      if (service.name === name) return service;
    }
    return undefined;
  }

  async list(filters?: {
    type?: string;
    status?: string;
  }): Promise<RegisteredService[]> {
    let results = Array.from(this.services.values());

    if (filters?.type) {
      results = results.filter((s) => s.type === filters.type);
    }

    return results;
  }

  async update(
    id: string,
    updates: Partial<ServiceDefinition>,
  ): Promise<RegisteredService | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;

    const updated = {
      ...service,
      ...updates,
      id,
      updatedAt: new Date(),
    };

    this.services.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.services.delete(id);
  }

  async addDeployment(serviceId: string, deployment: Deployment): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.deployments.set(deployment.id, deployment);
    }
  }

  async getDeployments(serviceId: string): Promise<Deployment[]> {
    const service = this.services.get(serviceId);
    return service ? Array.from(service.deployments.values()) : [];
  }

  getStats(): {
    totalServices: number;
    byType: Record<string, number>;
    activeDeployments: number;
  } {
    const byType: Record<string, number> = {};
    let activeDeployments = 0;

    for (const service of this.services.values()) {
      byType[service.type] = (byType[service.type] || 0) + 1;
      for (const dep of service.deployments.values()) {
        if (dep.status === 'running') activeDeployments++;
      }
    }

    return {
      totalServices: this.services.size,
      byType,
      activeDeployments,
    };
  }
}
