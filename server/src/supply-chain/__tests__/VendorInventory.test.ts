import { describe, it, expect, beforeEach } from '@jest/globals';
import { VendorService } from '../VendorService';
import { Vendor, FinanceRecord } from '../types';

describe('VendorService Inventory', () => {
  let service: VendorService;

  beforeEach(() => {
    service = new VendorService();
  });

  it('should create a vendor with default inventory fields', async () => {
    const vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'New SaaS',
      domain: 'newsaas.com',
      tier: 'strategic',
      status: 'active',
      complianceStatus: {
        soc2: true,
        iso27001: false,
        gdpr: true,
      },
      owner: 'alice@company.com',
      purpose: 'Marketing automation',
      criticality: 'Tier 1'
    };

    const vendor = await service.createVendor(vendorData);

    expect(vendor.id).toBeDefined();
    expect(vendor.name).toBe('New SaaS');
    expect(vendor.criticality).toBe('Tier 1');
    expect(vendor.financeRecords).toEqual([]);
    expect(vendor.ssoLogs).toEqual([]);
    expect(vendor.expenseData).toEqual([]);
  });

  it('should update vendor with finance records', async () => {
    const vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Cloud Provider',
      domain: 'cloud.com',
      tier: 'strategic',
      status: 'active',
      complianceStatus: {
        soc2: true,
        iso27001: true,
        gdpr: true,
      },
      criticality: 'Tier 0'
    };

    const vendor = await service.createVendor(vendorData);

    const record: FinanceRecord = {
        id: 'inv-123',
        amount: 5000,
        currency: 'USD',
        date: '2023-10-01',
        description: 'Monthly Hosting'
    };

    const updated = await service.updateVendor(vendor.id, {
        financeRecords: [record]
    });

    expect(updated).toBeDefined();
    expect(updated?.financeRecords).toHaveLength(1);
    expect(updated?.financeRecords![0].amount).toBe(5000);
  });
});
