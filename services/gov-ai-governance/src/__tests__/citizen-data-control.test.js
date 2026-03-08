"use strict";
/**
 * Citizen Data Control Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const citizen_data_control_js_1 = require("../citizen-data-control.js");
(0, vitest_1.describe)('CitizenDataControl', () => {
    let service;
    const testCitizenId = '550e8400-e29b-41d4-a716-446655440000';
    (0, vitest_1.beforeEach)(() => {
        service = new citizen_data_control_js_1.CitizenDataControl();
    });
    (0, vitest_1.describe)('grantConsent', () => {
        (0, vitest_1.it)('should record citizen consent', async () => {
            const consent = await service.grantConsent({
                citizenId: testCitizenId,
                dataCategories: ['personal_identity'],
                purposes: ['service_delivery'],
                consentGiven: true,
                withdrawable: true,
            });
            (0, vitest_1.expect)(consent.citizenId).toBe(testCitizenId);
            (0, vitest_1.expect)(consent.consentTimestamp).toBeDefined();
            (0, vitest_1.expect)(consent.consentGiven).toBe(true);
        });
        (0, vitest_1.it)('should store multiple consents for same citizen', async () => {
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
            (0, vitest_1.expect)(consents).toHaveLength(2);
        });
    });
    (0, vitest_1.describe)('checkConsent', () => {
        (0, vitest_1.it)('should return allowed when consent exists', async () => {
            await service.grantConsent({
                citizenId: testCitizenId,
                dataCategories: ['personal_identity'],
                purposes: ['service_delivery'],
                consentGiven: true,
                withdrawable: true,
            });
            const result = await service.checkConsent(testCitizenId, 'personal_identity', 'service_delivery');
            (0, vitest_1.expect)(result.allowed).toBe(true);
            (0, vitest_1.expect)(result.basis).toBe('explicit_consent');
        });
        (0, vitest_1.it)('should return not allowed when no consent', async () => {
            const result = await service.checkConsent(testCitizenId, 'biometric', 'research_anonymized');
            (0, vitest_1.expect)(result.allowed).toBe(false);
            (0, vitest_1.expect)(result.basis).toBe('no_consent');
        });
    });
    (0, vitest_1.describe)('withdrawConsent', () => {
        (0, vitest_1.it)('should remove matching consents', async () => {
            await service.grantConsent({
                citizenId: testCitizenId,
                dataCategories: ['personal_identity'],
                purposes: ['service_delivery'],
                consentGiven: true,
                withdrawable: true,
            });
            const success = await service.withdrawConsent(testCitizenId, ['personal_identity'], ['service_delivery']);
            (0, vitest_1.expect)(success).toBe(true);
        });
    });
    (0, vitest_1.describe)('submitAccessRequest', () => {
        (0, vitest_1.it)('should create data access request', async () => {
            const request = await service.submitAccessRequest({
                citizenId: testCitizenId,
                requestType: 'access',
                dataCategories: ['personal_identity'],
            });
            (0, vitest_1.expect)(request.requestId).toBeDefined();
            (0, vitest_1.expect)(request.status).toBe('pending');
            (0, vitest_1.expect)(request.submittedAt).toBeDefined();
        });
        (0, vitest_1.it)('should track request status', async () => {
            const request = await service.submitAccessRequest({
                citizenId: testCitizenId,
                requestType: 'portability',
                dataCategories: ['all'],
            });
            const status = await service.getRequestStatus(request.requestId);
            (0, vitest_1.expect)(status?.status).toBe('pending');
        });
    });
    (0, vitest_1.describe)('exportCitizenData', () => {
        (0, vitest_1.it)('should export all citizen data', async () => {
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
            (0, vitest_1.expect)(exportData.consents).toHaveLength(1);
            (0, vitest_1.expect)(exportData.requests).toHaveLength(1);
            (0, vitest_1.expect)(exportData.exportedAt).toBeDefined();
        });
    });
});
