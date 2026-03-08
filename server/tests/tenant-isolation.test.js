"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const investigationWorkflowService_js_1 = require("../src/services/investigationWorkflowService.js");
(0, globals_1.describe)('Investigation Workflow Service - Tenant Isolation', () => {
    const tenantA = 'tenant-a-uuid';
    const tenantB = 'tenant-b-uuid';
    const userA = 'user-a';
    const userB = 'user-b';
    (0, globals_1.beforeEach)(() => {
        // Reset service state if possible, or just create unique IDs
    });
    (0, globals_1.it)('should allow a user to create and retrieve their own investigation', async () => {
        const investigation = await investigationWorkflowService_js_1.investigationWorkflowService.createInvestigation('template-security-incident', {
            tenantId: tenantA,
            name: 'Incident Alpha',
            priority: 'HIGH',
            assignedTo: [userA],
            createdBy: userA,
        });
        (0, globals_1.expect)(investigation).toBeDefined();
        (0, globals_1.expect)(investigation.tenantId).toBe(tenantA);
        const retrieved = await investigationWorkflowService_js_1.investigationWorkflowService.getInvestigation(investigation.id, tenantA);
        (0, globals_1.expect)(retrieved).toBeDefined();
        (0, globals_1.expect)(retrieved?.id).toBe(investigation.id);
    });
    (0, globals_1.it)('should NOT allow a user from Tenant B to retrieve Tenant A investigation', async () => {
        // 1. Create investigation as Tenant A
        const investigationA = await investigationWorkflowService_js_1.investigationWorkflowService.createInvestigation('template-security-incident', {
            tenantId: tenantA,
            name: 'Secret Incident A',
            priority: 'CRITICAL',
            assignedTo: [userA],
            createdBy: userA,
        });
        // 2. Try to retrieve as Tenant B
        const retrievedB = await investigationWorkflowService_js_1.investigationWorkflowService.getInvestigation(investigationA.id, tenantB);
        // 3. Expect null (Not Found) or Error
        (0, globals_1.expect)(retrievedB).toBeNull();
    });
    (0, globals_1.it)('should NOT allow a user from Tenant B to modify Tenant A investigation', async () => {
        // 1. Create investigation as Tenant A
        const investigationA = await investigationWorkflowService_js_1.investigationWorkflowService.createInvestigation('template-security-incident', {
            tenantId: tenantA,
            name: 'Immutable Incident A',
            priority: 'MEDIUM',
            assignedTo: [userA],
            createdBy: userA,
        });
        // 2. Try to advance workflow as Tenant B
        await (0, globals_1.expect)(investigationWorkflowService_js_1.investigationWorkflowService.advanceWorkflowStage(investigationA.id, userB, tenantB)).rejects.toThrow(/Unauthorized/);
    });
    (0, globals_1.it)('should filter getAllInvestigations by tenant', async () => {
        // Create one for A
        await investigationWorkflowService_js_1.investigationWorkflowService.createInvestigation('template-security-incident', { tenantId: tenantA, name: 'List A', priority: 'LOW', assignedTo: [userA], createdBy: userA });
        // Create one for B
        await investigationWorkflowService_js_1.investigationWorkflowService.createInvestigation('template-security-incident', { tenantId: tenantB, name: 'List B', priority: 'LOW', assignedTo: [userB], createdBy: userB });
        const listA = investigationWorkflowService_js_1.investigationWorkflowService.getAllInvestigations(tenantA);
        const listB = investigationWorkflowService_js_1.investigationWorkflowService.getAllInvestigations(tenantB);
        (0, globals_1.expect)(listA.length).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(listA.every(i => i.tenantId === tenantA)).toBe(true);
        (0, globals_1.expect)(listB.length).toBeGreaterThanOrEqual(1);
        (0, globals_1.expect)(listB.every(i => i.tenantId === tenantB)).toBe(true);
        // Ensure no intersection in this simple check (IDs shouldn't overlap)
        const idsA = listA.map(i => i.id);
        const idsB = listB.map(i => i.id);
        const intersection = idsA.filter(id => idsB.includes(id));
        (0, globals_1.expect)(intersection).toEqual([]);
    });
});
