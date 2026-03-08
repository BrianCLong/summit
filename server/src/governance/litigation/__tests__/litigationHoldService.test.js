"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const repository_js_1 = require("../../retention/repository.js");
const litigationHoldService_js_1 = require("../litigationHoldService.js");
const createRepository = () => new repository_js_1.DataRetentionRepository({ query: globals_1.jest.fn() });
(0, globals_1.describe)('LitigationHoldService', () => {
    let repository;
    let service;
    (0, globals_1.beforeEach)(() => {
        repository = createRepository();
        globals_1.jest.spyOn(repository, 'setLegalHold').mockResolvedValue();
        service = new litigationHoldService_js_1.LitigationHoldService(repository);
    });
    (0, globals_1.it)('enforces triggering authority, deadlines, and acknowledgements', async () => {
        const form = {
            matterNumber: 'MTR-001',
            title: 'Contract dispute',
            description: 'Preserve communications and invoices',
            triggeringAuthority: 'gc',
            custodians: ['alice', 'bob'],
            systems: ['email', 'billing'],
            datasets: ['billing-events', 'customer-emails'],
            exposureAssessment: 'High risk of litigation',
            privilegeStatus: 'privileged',
            proposedScope: 'All billing records for ACME',
            nextSteps: ['Notify custodians', 'Pause deletion jobs'],
        };
        const hold = service.intakeMatter(form);
        (0, globals_1.expect)(hold.datasetId).toBe('billing-events');
        (0, globals_1.expect)(hold.datasets).toContain('customer-emails');
        (0, globals_1.expect)(hold.deadlineAcknowledgement.getTime()).toBeGreaterThan(hold.issuedAt.getTime());
        (0, globals_1.expect)(hold.deadlinePreservation.getTime()).toBeGreaterThan(hold.deadlineAcknowledgement.getTime());
        const acknowledged = service.acknowledgeHold(hold.id, 'alice', 'email');
        (0, globals_1.expect)(acknowledged.acknowledgements).toHaveLength(1);
        (0, globals_1.expect)(acknowledged.acknowledgements[0].acknowledgementHash.length).toBeGreaterThan(10);
        await service.applyHoldToDataset('billing-events', hold);
        (0, globals_1.expect)(repository.setLegalHold).toHaveBeenCalled();
        const callArgs = repository.setLegalHold.mock.calls[0][1];
        (0, globals_1.expect)(callArgs.matterNumber).toBe('MTR-001');
        (0, globals_1.expect)(callArgs.custodians).toContain('alice');
        (0, globals_1.expect)(callArgs.acknowledgedBy?.length).toBe(1);
    });
    (0, globals_1.it)('tracks active holds across multiple datasets and releases them', () => {
        const form = {
            matterNumber: 'MTR-002',
            title: 'Employment dispute',
            description: 'Preserve HR records',
            triggeringAuthority: 'head_of_people',
            custodians: ['charlie'],
            systems: ['hris'],
            datasets: ['hr-records', 'access-logs'],
            exposureAssessment: 'Medium',
            privilegeStatus: 'privileged',
            proposedScope: 'All HRIS exports and access logs',
            nextSteps: ['Notify HR', 'Notify IT'],
        };
        const hold = service.intakeMatter(form);
        (0, globals_1.expect)(service.hasActiveHold('access-logs')).toBe(true);
        (0, globals_1.expect)(service.activeHoldsForDataset('hr-records')).toHaveLength(1);
        service.releaseHold(hold.id, 'gc');
        (0, globals_1.expect)(service.hasActiveHold('access-logs')).toBe(false);
    });
    (0, globals_1.it)('rejects holds from unauthorized authorities', () => {
        const badForm = {
            matterNumber: 'MTR-003',
            title: 'Unauthorized',
            description: 'Should fail',
            triggeringAuthority: 'deputy_gc',
            custodians: [],
            systems: [],
            datasets: [],
            exposureAssessment: 'low',
            privilegeStatus: 'non-privileged',
            proposedScope: 'n/a',
            nextSteps: [],
        };
        (0, globals_1.expect)(() => service.intakeMatter({ ...badForm, triggeringAuthority: 'cfo' })).toThrow('Triggering authority not permitted to issue holds');
        (0, globals_1.expect)(() => service.intakeMatter(badForm)).toThrow('At least one dataset must be associated to a hold');
    });
});
