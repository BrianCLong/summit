import { describe, it, expect, beforeEach } from 'vitest';
import { CitizenService } from '../services/CitizenService.js';
import { CitizenDataStore } from '../services/CitizenDataStore.js';

describe('CitizenService', () => {
  let service: CitizenService;
  let store: CitizenDataStore;

  beforeEach(() => {
    store = new CitizenDataStore();
    service = new CitizenService(store);
  });

  describe('registerCitizen', () => {
    it('should register a new citizen', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'TEST-001',
        firstName: 'John',
        lastName: 'Doe',
        source: 'test',
      });

      expect(citizen).toHaveProperty('id');
      expect(citizen.nationalId).toBe('TEST-001');
      expect(citizen.firstName).toBe('John');
      expect(citizen.verified).toBe(false);
    });

    it('should update existing citizen by nationalId', async () => {
      const first = await service.registerCitizen({
        nationalId: 'TEST-002',
        firstName: 'Jane',
        lastName: 'Doe',
        source: 'test',
      });

      const updated = await service.registerCitizen({
        nationalId: 'TEST-002',
        firstName: 'Jane',
        lastName: 'Smith',
        source: 'test',
      });

      expect(updated.id).toBe(first.id);
      expect(updated.lastName).toBe('Smith');
    });

    it('should preserve verification status on update', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'TEST-003',
        firstName: 'Test',
        lastName: 'User',
        source: 'test',
      });

      // Manually set verified (simulating verification process)
      await store.updateCitizen(citizen.id, { verified: true });

      const updated = await service.registerCitizen({
        nationalId: 'TEST-003',
        firstName: 'Test',
        lastName: 'Updated',
        source: 'test',
      });

      expect(updated.verified).toBe(true);
    });
  });

  describe('consent management', () => {
    it('should grant consent for a domain', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'CONSENT-001',
        firstName: 'Consent',
        lastName: 'Test',
        source: 'test',
      });

      const consent = await service.grantConsent({
        citizenId: citizen.id,
        domain: 'healthcare',
        scope: ['profile', 'medical_history'],
      });

      expect(consent.consentGiven).toBe(true);
      expect(consent.domain).toBe('healthcare');
    });

    it('should check consent before service request', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'CONSENT-002',
        firstName: 'No',
        lastName: 'Consent',
        source: 'test',
      });

      await expect(
        service.requestService({
          citizenId: citizen.id,
          domain: 'healthcare',
          serviceType: 'checkup',
        })
      ).rejects.toThrow('Consent required');
    });
  });

  describe('service requests', () => {
    it('should create service request with consent', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'SVC-001',
        firstName: 'Service',
        lastName: 'Test',
        source: 'test',
      });

      await service.grantConsent({
        citizenId: citizen.id,
        domain: 'education',
        scope: ['profile'],
      });

      const record = await service.requestService({
        citizenId: citizen.id,
        domain: 'education',
        serviceType: 'enrollment',
      });

      expect(record).toHaveProperty('id');
      expect(record.status).toBe('pending');
      expect(record.domain).toBe('education');
    });
  });

  describe('eligibility', () => {
    it('should compute eligibility for services', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'ELIG-001',
        firstName: 'Eligible',
        lastName: 'Citizen',
        source: 'test',
      });

      const eligibility = await service.computeEligibility({
        citizenId: citizen.id,
        domain: 'education',
        serviceType: 'basic_education',
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.domain).toBe('education');
    });

    it('should return recommendations for eligible services', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'REC-001',
        firstName: 'Recommend',
        lastName: 'Test',
        source: 'test',
      });

      await service.computeEligibility({
        citizenId: citizen.id,
        domain: 'education',
        serviceType: 'scholarship',
      });

      const recommendations = await service.getRecommendations(citizen.id);
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('unified view', () => {
    it('should return complete citizen view', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'VIEW-001',
        firstName: 'Unified',
        lastName: 'View',
        source: 'test',
      });

      await service.grantConsent({
        citizenId: citizen.id,
        domain: 'healthcare',
        scope: ['profile'],
      });

      const view = await service.getUnifiedView(citizen.id);

      expect(view.profile).toBeDefined();
      expect(view.profile?.nationalId).toBe('VIEW-001');
      expect(view.consents.length).toBe(1);
      expect(view.serviceHistory).toEqual([]);
    });
  });

  describe('data transfer', () => {
    it('should transfer data between domains with consent', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'XFER-001',
        firstName: 'Transfer',
        lastName: 'Test',
        source: 'test',
      });

      await service.grantConsent({
        citizenId: citizen.id,
        domain: 'healthcare',
        scope: ['profile'],
      });

      await service.grantConsent({
        citizenId: citizen.id,
        domain: 'education',
        scope: ['profile'],
      });

      const result = await service.transferData({
        citizenId: citizen.id,
        fromDomain: 'healthcare',
        toDomain: 'education',
        dataFields: ['profile'],
      });

      expect(result.success).toBe(true);
    });

    it('should reject transfer without consent', async () => {
      const citizen = await service.registerCitizen({
        nationalId: 'XFER-002',
        firstName: 'No',
        lastName: 'Transfer',
        source: 'test',
      });

      const result = await service.transferData({
        citizenId: citizen.id,
        fromDomain: 'healthcare',
        toDomain: 'education',
        dataFields: ['profile'],
      });

      expect(result.success).toBe(false);
    });
  });
});
