"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const CitizenService_js_1 = require("../services/CitizenService.js");
const CitizenDataStore_js_1 = require("../services/CitizenDataStore.js");
(0, vitest_1.describe)('CitizenService', () => {
    let service;
    let store;
    (0, vitest_1.beforeEach)(() => {
        store = new CitizenDataStore_js_1.CitizenDataStore();
        service = new CitizenService_js_1.CitizenService(store);
    });
    (0, vitest_1.describe)('registerCitizen', () => {
        (0, vitest_1.it)('should register a new citizen', async () => {
            const citizen = await service.registerCitizen({
                nationalId: 'TEST-001',
                firstName: 'John',
                lastName: 'Doe',
                source: 'test',
            });
            (0, vitest_1.expect)(citizen).toHaveProperty('id');
            (0, vitest_1.expect)(citizen.nationalId).toBe('TEST-001');
            (0, vitest_1.expect)(citizen.firstName).toBe('John');
            (0, vitest_1.expect)(citizen.verified).toBe(false);
        });
        (0, vitest_1.it)('should update existing citizen by nationalId', async () => {
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
            (0, vitest_1.expect)(updated.id).toBe(first.id);
            (0, vitest_1.expect)(updated.lastName).toBe('Smith');
        });
        (0, vitest_1.it)('should preserve verification status on update', async () => {
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
            (0, vitest_1.expect)(updated.verified).toBe(true);
        });
    });
    (0, vitest_1.describe)('consent management', () => {
        (0, vitest_1.it)('should grant consent for a domain', async () => {
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
            (0, vitest_1.expect)(consent.consentGiven).toBe(true);
            (0, vitest_1.expect)(consent.domain).toBe('healthcare');
        });
        (0, vitest_1.it)('should check consent before service request', async () => {
            const citizen = await service.registerCitizen({
                nationalId: 'CONSENT-002',
                firstName: 'No',
                lastName: 'Consent',
                source: 'test',
            });
            await (0, vitest_1.expect)(service.requestService({
                citizenId: citizen.id,
                domain: 'healthcare',
                serviceType: 'checkup',
            })).rejects.toThrow('Consent required');
        });
    });
    (0, vitest_1.describe)('service requests', () => {
        (0, vitest_1.it)('should create service request with consent', async () => {
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
            (0, vitest_1.expect)(record).toHaveProperty('id');
            (0, vitest_1.expect)(record.status).toBe('pending');
            (0, vitest_1.expect)(record.domain).toBe('education');
        });
    });
    (0, vitest_1.describe)('eligibility', () => {
        (0, vitest_1.it)('should compute eligibility for services', async () => {
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
            (0, vitest_1.expect)(eligibility.eligible).toBe(true);
            (0, vitest_1.expect)(eligibility.domain).toBe('education');
        });
        (0, vitest_1.it)('should return recommendations for eligible services', async () => {
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
            (0, vitest_1.expect)(recommendations.length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('unified view', () => {
        (0, vitest_1.it)('should return complete citizen view', async () => {
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
            (0, vitest_1.expect)(view.profile).toBeDefined();
            (0, vitest_1.expect)(view.profile?.nationalId).toBe('VIEW-001');
            (0, vitest_1.expect)(view.consents.length).toBe(1);
            (0, vitest_1.expect)(view.serviceHistory).toEqual([]);
        });
    });
    (0, vitest_1.describe)('data transfer', () => {
        (0, vitest_1.it)('should transfer data between domains with consent', async () => {
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
            (0, vitest_1.expect)(result.success).toBe(true);
        });
        (0, vitest_1.it)('should reject transfer without consent', async () => {
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
            (0, vitest_1.expect)(result.success).toBe(false);
        });
    });
});
