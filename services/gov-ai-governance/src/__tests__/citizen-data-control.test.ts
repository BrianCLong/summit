/**
 * Citizen Data Control Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CitizenDataControl } from '../citizen-data-control.js';

describe('CitizenDataControl', () => {
  let service: CitizenDataControl;
  const testCitizenId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    service = new CitizenDataControl();
  });

  describe('grantConsent', () => {
    it('should record citizen consent', async () => {
      const consent = await service.grantConsent({
        citizenId: testCitizenId,
        dataCategories: ['personal_identity'],
        purposes: ['service_delivery'],
        consentGiven: true,
        withdrawable: true,
      });

      expect(consent.citizenId).toBe(testCitizenId);
      expect(consent.consentTimestamp).toBeDefined();
      expect(consent.consentGiven).toBe(true);
    });

    it('should store multiple consents for same citizen', async () => {
      await service.grantConsent({
        citizenId: testCitizenId,
        dataCategories: ['personal_identity'],
        purposes: ['service_delivery'],
        consentGiven: true,
        withdrawable: true,
      });

      await service.grantConsent({
        citizenId: testCitizenId,
        dataCategories: ['contact_information'],
        purposes: ['fraud_prevention'],
        consentGiven: true,
        withdrawable: true,
      });

      const consents = await service.getConsents(testCitizenId);
      expect(consents).toHaveLength(2);
    });
  });

  describe('checkConsent', () => {
    it('should return allowed when consent exists', async () => {
      await service.grantConsent({
        citizenId: testCitizenId,
        dataCategories: ['personal_identity'],
        purposes: ['service_delivery'],
        consentGiven: true,
        withdrawable: true,
      });

      const result = await service.checkConsent(
        testCitizenId,
        'personal_identity',
        'service_delivery',
      );

      expect(result.allowed).toBe(true);
      expect(result.basis).toBe('explicit_consent');
    });

    it('should return not allowed when no consent', async () => {
      const result = await service.checkConsent(
        testCitizenId,
        'biometric',
        'research_anonymized',
      );

      expect(result.allowed).toBe(false);
      expect(result.basis).toBe('no_consent');
    });
  });

  describe('withdrawConsent', () => {
    it('should remove matching consents', async () => {
      await service.grantConsent({
        citizenId: testCitizenId,
        dataCategories: ['personal_identity'],
        purposes: ['service_delivery'],
        consentGiven: true,
        withdrawable: true,
      });

      const success = await service.withdrawConsent(
        testCitizenId,
        ['personal_identity'],
        ['service_delivery'],
      );

      expect(success).toBe(true);
    });
  });

  describe('submitAccessRequest', () => {
    it('should create data access request', async () => {
      const request = await service.submitAccessRequest({
        citizenId: testCitizenId,
        requestType: 'access',
        dataCategories: ['personal_identity'],
      });

      expect(request.requestId).toBeDefined();
      expect(request.status).toBe('pending');
      expect(request.submittedAt).toBeDefined();
    });

    it('should track request status', async () => {
      const request = await service.submitAccessRequest({
        citizenId: testCitizenId,
        requestType: 'portability',
        dataCategories: ['all'],
      });

      const status = await service.getRequestStatus(request.requestId);
      expect(status?.status).toBe('pending');
    });
  });

  describe('exportCitizenData', () => {
    it('should export all citizen data', async () => {
      await service.grantConsent({
        citizenId: testCitizenId,
        dataCategories: ['personal_identity'],
        purposes: ['service_delivery'],
        consentGiven: true,
        withdrawable: true,
      });

      await service.submitAccessRequest({
        citizenId: testCitizenId,
        requestType: 'access',
        dataCategories: ['all'],
      });

      const exportData = await service.exportCitizenData(testCitizenId);

      expect(exportData.consents).toHaveLength(1);
      expect(exportData.requests).toHaveLength(1);
      expect(exportData.exportedAt).toBeDefined();
    });
  });
});
