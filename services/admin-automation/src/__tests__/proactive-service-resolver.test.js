"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const citizen_profile_aggregator_js_1 = require("../citizen-profile-aggregator.js");
const proactive_service_resolver_js_1 = require("../proactive-service-resolver.js");
(0, vitest_1.describe)('ProactiveServiceResolver', () => {
    let aggregator;
    let resolver;
    (0, vitest_1.beforeEach)(() => {
        aggregator = new citizen_profile_aggregator_js_1.CitizenProfileAggregator();
        resolver = new proactive_service_resolver_js_1.ProactiveServiceResolver(aggregator);
    });
    (0, vitest_1.describe)('predictServiceNeeds', () => {
        (0, vitest_1.it)('should predict renewal for expiring documents', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 30);
            await aggregator.createProfile({
                id: 'citizen-expiring',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [
                    {
                        type: 'driver_license',
                        documentId: 'DL-001',
                        uploadedAt: '2020-01-01',
                        expiresAt: futureDate.toISOString(),
                    },
                ],
                submissions: [],
            });
            const needs = await resolver.predictServiceNeeds('citizen-expiring');
            (0, vitest_1.expect)(needs.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(needs[0].serviceType).toBe('driver_license_renewal');
            (0, vitest_1.expect)(needs[0].confidence).toBeGreaterThanOrEqual(0.8);
            (0, vitest_1.expect)(needs[0].autoResolvable).toBe(true);
        });
        (0, vitest_1.it)('should not predict for documents expiring beyond 60 days', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 90);
            await aggregator.createProfile({
                id: 'citizen-not-expiring',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [
                    {
                        type: 'passport',
                        documentId: 'PP-001',
                        uploadedAt: '2020-01-01',
                        expiresAt: futureDate.toISOString(),
                    },
                ],
                submissions: [],
            });
            const needs = await resolver.predictServiceNeeds('citizen-not-expiring');
            (0, vitest_1.expect)(needs).toHaveLength(0);
        });
        (0, vitest_1.it)('should detect annual submission patterns', async () => {
            const now = new Date();
            // Set last submission to ~350 days ago so next due is ~15 days from now
            const lastSubmission = new Date(now);
            lastSubmission.setDate(lastSubmission.getDate() - 350);
            const previousSubmission = new Date(lastSubmission);
            previousSubmission.setFullYear(previousSubmission.getFullYear() - 1);
            // Next due would be ~15 days from now, within 45 days window
            const submissions = [
                { formId: 'annual-report', submittedAt: previousSubmission.toISOString(), status: 'completed' },
                { formId: 'annual-report', submittedAt: lastSubmission.toISOString(), status: 'completed' },
            ];
            await aggregator.createProfile({
                id: 'citizen-annual',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [],
                submissions,
            });
            const needs = await resolver.predictServiceNeeds('citizen-annual');
            const annualNeed = needs.find(n => n.serviceType.includes('annual'));
            (0, vitest_1.expect)(annualNeed).toBeDefined();
            (0, vitest_1.expect)(annualNeed?.confidence).toBe(0.85);
        });
        (0, vitest_1.it)('should return empty for non-existent citizen', async () => {
            const needs = await resolver.predictServiceNeeds('non-existent');
            (0, vitest_1.expect)(needs).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('autoResolve', () => {
        (0, vitest_1.it)('should auto-resolve renewal needs', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);
            await aggregator.createProfile({
                id: 'citizen-resolve',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [
                    {
                        type: 'license',
                        documentId: 'L-001',
                        uploadedAt: '2020-01-01',
                        expiresAt: futureDate.toISOString(),
                    },
                ],
                submissions: [],
            });
            const needs = await resolver.predictServiceNeeds('citizen-resolve');
            const result = await resolver.autoResolve(needs[0].id, 'citizen-resolve');
            (0, vitest_1.expect)(result.resolved).toBe(true);
            (0, vitest_1.expect)(result.action).toContain('Renewal');
        });
        (0, vitest_1.it)('should return not resolved for non-auto-resolvable needs', async () => {
            // Manually create a non-auto-resolvable need scenario
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 20);
            await aggregator.createProfile({
                id: 'citizen-manual',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [],
                submissions: [],
            });
            const result = await resolver.autoResolve('fake-need-id', 'citizen-manual');
            (0, vitest_1.expect)(result.resolved).toBe(false);
        });
    });
    (0, vitest_1.describe)('getPendingNeeds', () => {
        (0, vitest_1.it)('should return only pending and notified needs', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 25);
            await aggregator.createProfile({
                id: 'citizen-pending',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [
                    {
                        type: 'permit',
                        documentId: 'P-001',
                        uploadedAt: '2020-01-01',
                        expiresAt: futureDate.toISOString(),
                    },
                ],
                submissions: [],
            });
            await resolver.predictServiceNeeds('citizen-pending');
            const pending = await resolver.getPendingNeeds('citizen-pending');
            (0, vitest_1.expect)(pending.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(pending.every(n => n.status === 'predicted' || n.status === 'notified')).toBe(true);
        });
    });
    (0, vitest_1.describe)('notifyCitizen', () => {
        (0, vitest_1.it)('should update need status to notified', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 15);
            await aggregator.createProfile({
                id: 'citizen-notify',
                personal: { firstName: 'Test', lastName: 'User', dateOfBirth: '1990-01-01' },
                contact: { email: 'test@example.com', phone: '555-0000' },
                address: { street: '', city: '', state: '', zipCode: '', country: 'US' },
                documents: [
                    {
                        type: 'registration',
                        documentId: 'R-001',
                        uploadedAt: '2020-01-01',
                        expiresAt: futureDate.toISOString(),
                    },
                ],
                submissions: [],
            });
            const needs = await resolver.predictServiceNeeds('citizen-notify');
            await resolver.notifyCitizen('citizen-notify', needs[0].id);
            const pending = await resolver.getPendingNeeds('citizen-notify');
            const notified = pending.find(n => n.id === needs[0].id);
            (0, vitest_1.expect)(notified?.status).toBe('notified');
        });
    });
});
