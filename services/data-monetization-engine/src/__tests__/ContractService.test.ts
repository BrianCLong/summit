import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContractService } from '../services/ContractService.js';
import { DataProduct, CreateContractInput } from '@intelgraph/data-monetization-types';

describe('ContractService', () => {
  let service: ContractService;
  let testProduct: DataProduct;
  let testContractInput: CreateContractInput;

  beforeEach(() => {
    service = new ContractService();

    testProduct = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Premium Transaction Data',
      description: 'High-quality transaction data for financial analytics',
      shortDescription: 'Transaction data feed',
      version: '1.0.0',
      assets: ['asset-1', 'asset-2'],
      category: 'TRANSACTION',
      accessLevel: 'FULL',
      pricing: {
        model: 'SUBSCRIPTION',
        basePriceCents: 500000,
        currency: 'USD',
      },
      deliveryMethods: ['API', 'BULK_DOWNLOAD'],
      sla: {
        availabilityPercent: 99.9,
        latencyMs: 100,
        supportTier: 'PREMIUM',
        refreshFrequency: 'hourly',
      },
      complianceCertifications: ['GDPR', 'SOC2'],
      targetAudiences: ['Financial Services', 'Analytics'],
      useCases: ['Risk Assessment', 'Market Analysis'],
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      owner: 'data-team',
      tenantId: 'tenant-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    testContractInput = {
      type: 'DATA_LICENSE',
      productId: testProduct.id,
      providerId: 'provider-1',
      providerName: 'Data Corp',
      consumerId: 'consumer-1',
      consumerName: 'Analytics Inc',
      terms: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenewal: true,
        renewalPeriodDays: 365,
        terminationNoticeDays: 30,
      },
      pricing: {
        totalValueCents: 600000,
        currency: 'USD',
        paymentTerms: 'Net 30',
        billingFrequency: 'ANNUAL',
      },
      dataRights: {
        allowedPurposes: ['Internal Analytics', 'Research'],
        prohibitedUses: ['Resale', 'Sublicensing'],
        geographicRestrictions: [],
        sublicensing: false,
        derivativeWorks: true,
        attribution: true,
        exclusivity: false,
      },
      compliance: {
        frameworks: ['GDPR', 'SOC2'],
        dataProtectionOfficer: 'dpo@analytics.com',
        securityMeasures: ['Encryption at rest', 'Access controls'],
        auditRights: true,
        breachNotificationHours: 72,
      },
      tenantId: 'tenant-1',
    };
  });

  describe('generateContract', () => {
    it('should generate a contract with all required fields', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);

      expect(contract.id).toBeDefined();
      expect(contract.contractNumber).toBeDefined();
      expect(contract.contractNumber).toMatch(/^DL-\d{4}-\d{5}$/);
      expect(contract.type).toBe('DATA_LICENSE');
      expect(contract.status).toBe('DRAFT');
      expect(contract.productId).toBe(testProduct.id);
      expect(contract.providerId).toBe(testContractInput.providerId);
      expect(contract.consumerId).toBe(testContractInput.consumerId);
    });

    it('should generate unique contract numbers', async () => {
      const contract1 = await service.generateContract(testContractInput, testProduct);
      const contract2 = await service.generateContract(testContractInput, testProduct);

      expect(contract1.contractNumber).not.toBe(contract2.contractNumber);
    });

    it('should use correct prefix for different contract types', async () => {
      const licenseContract = await service.generateContract(
        { ...testContractInput, type: 'DATA_LICENSE' },
        testProduct,
      );
      const sharingContract = await service.generateContract(
        { ...testContractInput, type: 'DATA_SHARING' },
        testProduct,
      );
      const processingContract = await service.generateContract(
        { ...testContractInput, type: 'DATA_PROCESSING' },
        testProduct,
      );

      expect(licenseContract.contractNumber).toMatch(/^DL-/);
      expect(sharingContract.contractNumber).toMatch(/^DS-/);
      expect(processingContract.contractNumber).toMatch(/^DP-/);
    });
  });

  describe('generateContractDocument', () => {
    it('should generate a complete contract document', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);
      const document = service.generateContractDocument(contract, testProduct);

      expect(document).toContain('DATA LICENSE AGREEMENT');
      expect(document).toContain(contract.contractNumber);
      expect(document).toContain(contract.providerName);
      expect(document).toContain(contract.consumerName);
      expect(document).toContain('RECITALS');
      expect(document).toContain('DEFINITIONS');
      expect(document).toContain('DATA RIGHTS');
      expect(document).toContain('SIGNATURE PAGE');
    });

    it('should include GDPR clauses when GDPR is in compliance frameworks', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);
      const document = service.generateContractDocument(contract, testProduct);

      expect(document).toContain('GDPR COMPLIANCE');
      expect(document).toContain('Data Controller');
      expect(document).toContain('Data Processor');
      expect(document).toContain('Personal Data breach');
    });

    it('should include payment terms', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);
      const document = service.generateContractDocument(contract, testProduct);

      expect(document).toContain('PAYMENT TERMS');
      expect(document).toContain('$6,000.00');
    });

    it('should include termination clauses', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);
      const document = service.generateContractDocument(contract, testProduct);

      expect(document).toContain('TERM AND TERMINATION');
      expect(document).toContain('30 days');
    });
  });

  describe('signContract', () => {
    it('should add signature to contract', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);
      const signed = await service.signContract(
        contract,
        'provider',
        'John Smith',
        'digital-sig-123',
      );

      expect(signed.signatures).toHaveLength(1);
      expect(signed.signatures[0].party).toBe('provider');
      expect(signed.signatures[0].signedBy).toBe('John Smith');
      expect(signed.signatures[0].digitalSignature).toBe('digital-sig-123');
      expect(signed.status).toBe('PENDING_APPROVAL');
    });

    it('should activate contract when both parties sign', async () => {
      const contract = await service.generateContract(testContractInput, testProduct);

      await service.signContract(contract, 'provider', 'John Smith');
      const fullyExecuted = await service.signContract(contract, 'consumer', 'Jane Doe');

      expect(fullyExecuted.signatures).toHaveLength(2);
      expect(fullyExecuted.status).toBe('ACTIVE');
    });
  });
});
