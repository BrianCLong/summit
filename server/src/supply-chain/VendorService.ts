import { Vendor } from './types';
import { randomUUID } from 'crypto';

export class VendorService {
  // In-memory store for prototype
  private vendors: Map<string, Vendor> = new Map();

  async createVendor(data: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const vendor: Vendor = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.vendors.set(id, vendor);
    return vendor;
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    return this.vendors.get(id);
  }

  async listVendors(): Promise<Vendor[]> {
    return Array.from(this.vendors.values());
  }

  async updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor | undefined> {
    const vendor = this.vendors.get(id);
    if (!vendor) return undefined;

    const updated: Vendor = {
      ...vendor,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.vendors.set(id, updated);
    return updated;
  }
}
