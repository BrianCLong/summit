"use strict";
/**
 * Case Workflow Integration Tests
 * Tests complete case lifecycle with workflow, tasks, SLAs, and approvals
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../../../src/cases/workflow/index.js");
const postgres_js_1 = require("../../../src/db/postgres.js");
(0, globals_1.describe)('Case Workflow Integration Tests', () => {
    let pg;
    let workflowService;
    let testCaseId;
    let testUserId;
    let investigatorRoleId;
    (0, globals_1.beforeAll)(async () => {
        pg = (0, postgres_js_1.getPostgresPool)();
        workflowService = new index_js_1.CaseWorkflowService(pg);
        // Get investigator role
        const investigatorRole = await workflowService.getRoleByName('investigator');
        if (!investigatorRole) {
            throw new Error('Investigator role not found - run migrations first');
        }
        investigatorRoleId = investigatorRole.id;
        testUserId = 'test-user-001';
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup test data
        if (testCaseId) {
            await pg.query('DELETE FROM maestro.cases WHERE id = $1', [testCaseId]);
        }
        await pg.end();
    });
    (0, globals_1.describe)('Complete Case Lifecycle', () => {
        (0, globals_1.it)('should create a case and manage workflow', async () => {
            // 1. Create case (using CaseRepo directly for this test)
            const { rows: caseRows } = await pg.query(`INSERT INTO maestro.cases (
          id, tenant_id, title, description, status, case_type, priority, created_by
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING id`, [
                'test-tenant',
                'Test Investigation Case',
                'Testing workflow engine',
                'open',
                'investigation',
                'high',
                testUserId,
            ]);
            testCaseId = caseRows[0].id;
            (0, globals_1.expect)(testCaseId).toBeDefined();
            // 2. Add participant
            const participant = await workflowService.addParticipant({
                caseId: testCaseId,
                userId: testUserId,
                roleId: investigatorRoleId,
                assignedBy: 'system',
            });
            (0, globals_1.expect)(participant.caseId).toBe(testCaseId);
            (0, globals_1.expect)(participant.userId).toBe(testUserId);
            (0, globals_1.expect)(participant.isActive).toBe(true);
            // 3. Transition to intake stage
            const transitionResult = await workflowService.transitionStage({
                caseId: testCaseId,
                toStage: 'intake',
                userId: testUserId,
                reason: 'Case opened for investigation',
                legalBasis: 'investigation',
            }, {
                legalBasis: 'investigation',
            });
            (0, globals_1.expect)(transitionResult.success).toBe(true);
            (0, globals_1.expect)(transitionResult.newStage).toBe('intake');
            // 4. Create task
            const task = await workflowService.createTask({
                caseId: testCaseId,
                title: 'Initial assessment',
                description: 'Assess the case and gather preliminary information',
                taskType: 'analysis',
                priority: 'high',
                assignedTo: testUserId,
                dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                createdBy: testUserId,
            }, {
                legalBasis: 'investigation',
                reason: 'Initial task for case assessment',
            });
            (0, globals_1.expect)(task.caseId).toBe(testCaseId);
            (0, globals_1.expect)(task.status).toBe('pending');
            // 5. Complete task
            const completedTask = await workflowService.completeTask(task.id, testUserId, {
                findings: 'Preliminary investigation reveals suspicious activity',
                confidence: 0.85,
            });
            (0, globals_1.expect)(completedTask?.status).toBe('completed');
            (0, globals_1.expect)(completedTask?.resultData.findings).toBeDefined();
            // 6. Get SLA summary
            const slaSummary = await workflowService.getCaseSLASummary(testCaseId);
            (0, globals_1.expect)(slaSummary.totalSlas).toBeGreaterThan(0);
            // 7. List tasks
            const tasks = await workflowService.listTasks({ caseId: testCaseId });
            (0, globals_1.expect)(tasks.length).toBeGreaterThan(0);
            // 8. Get participants
            const participants = await workflowService.getCaseParticipants(testCaseId);
            (0, globals_1.expect)(participants.length).toBe(1);
            (0, globals_1.expect)(participants[0].userId).toBe(testUserId);
        });
        (0, globals_1.it)('should handle 4-eyes approval workflow', async () => {
            if (!testCaseId) {
                // Create a test case if not already created
                const { rows } = await pg.query(`INSERT INTO maestro.cases (
            id, tenant_id, title, case_type, priority, created_by
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
          RETURNING id`, ['test-tenant', 'Approval Test Case', 'investigation', 'high', testUserId]);
                testCaseId = rows[0].id;
            }
            // 1. Request 4-eyes approval
            const approval = await workflowService.requestApproval({
                caseId: testCaseId,
                approvalType: '4-eyes',
                requestedBy: testUserId,
                reason: 'Escalation to law enforcement requires dual approval',
            });
            (0, globals_1.expect)(approval.status).toBe('pending');
            (0, globals_1.expect)(approval.requiredApprovers).toBe(2);
            // 2. First approver votes
            const vote1 = await workflowService.submitApprovalVote({
                approvalId: approval.id,
                approverUserId: 'approver-001',
                decision: 'approve',
                reason: 'Evidence supports escalation',
            });
            (0, globals_1.expect)(vote1.decision).toBe('approve');
            // 3. Check approval status (should still be pending with 1/2 votes)
            const partialApproval = await workflowService.approvalRepo.getApproval(approval.id);
            (0, globals_1.expect)(partialApproval?.status).toBe('pending'); // Not yet approved
            // 4. Second approver votes
            const vote2 = await workflowService.submitApprovalVote({
                approvalId: approval.id,
                approverUserId: 'approver-002',
                decision: 'approve',
                reason: 'Agreed, escalation warranted',
            });
            (0, globals_1.expect)(vote2.decision).toBe('approve');
            // 5. Check approval status (should now be approved with 2/2 votes)
            const completedApproval = await workflowService.approvalRepo.getApproval(approval.id);
            (0, globals_1.expect)(completedApproval?.status).toBe('approved');
            (0, globals_1.expect)(completedApproval?.completedAt).toBeDefined();
        });
        (0, globals_1.it)('should track available transitions based on role', async () => {
            if (!testCaseId)
                return;
            // User with investigator role should see specific transitions
            const transitions = await workflowService.getAvailableTransitions(testCaseId, testUserId);
            (0, globals_1.expect)(Array.isArray(transitions)).toBe(true);
            // Available transitions depend on current stage
        });
        (0, globals_1.it)('should prevent invalid stage transitions', async () => {
            if (!testCaseId)
                return;
            // Try to transition from intake directly to completed (should fail)
            const result = await workflowService.transitionStage({
                caseId: testCaseId,
                toStage: 'completed',
                userId: testUserId,
                reason: 'Attempting invalid transition',
                legalBasis: 'investigation',
            }, {
                legalBasis: 'investigation',
            });
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors).toBeDefined();
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('SLA Management', () => {
        (0, globals_1.it)('should create and track SLAs', async () => {
            if (!testCaseId)
                return;
            // Create a manual SLA
            const sla = await workflowService.createSLA({
                caseId: testCaseId,
                slaType: 'case_completion',
                targetHours: 168, // 7 days
            });
            (0, globals_1.expect)(sla.caseId).toBe(testCaseId);
            (0, globals_1.expect)(sla.status).toBe('active');
            (0, globals_1.expect)(sla.targetHours).toBe(168);
            // Get all SLAs for case
            const slas = await workflowService.getCaseSLAs(testCaseId);
            (0, globals_1.expect)(slas.length).toBeGreaterThan(0);
            // Get SLA summary
            const summary = await workflowService.getCaseSLASummary(testCaseId);
            (0, globals_1.expect)(summary.totalSlas).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.activeSlas).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should detect overdue tasks', async () => {
            if (!testCaseId)
                return;
            // Create a task that's already overdue
            const pastDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
            const overdueTask = await workflowService.createTask({
                caseId: testCaseId,
                title: 'Overdue task test',
                taskType: 'standard',
                priority: 'high',
                assignedTo: testUserId,
                dueDate: pastDueDate,
                createdBy: testUserId,
            }, {
                legalBasis: 'investigation',
                reason: 'Testing overdue task detection',
            });
            // Get overdue tasks
            const overdueTasks = await workflowService.getOverdueTasks(testCaseId);
            (0, globals_1.expect)(overdueTasks.length).toBeGreaterThan(0);
            const foundOverdueTask = overdueTasks.find((t) => t.taskId === overdueTask.id);
            (0, globals_1.expect)(foundOverdueTask).toBeDefined();
            (0, globals_1.expect)(foundOverdueTask?.daysOverdue).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Role Management', () => {
        (0, globals_1.it)('should list system roles', async () => {
            const systemRoles = await workflowService.listRoles(true);
            (0, globals_1.expect)(systemRoles.length).toBeGreaterThan(0);
            const roleNames = systemRoles.map((r) => r.name);
            (0, globals_1.expect)(roleNames).toContain('investigator');
            (0, globals_1.expect)(roleNames).toContain('analyst');
            (0, globals_1.expect)(roleNames).toContain('approver');
        });
        (0, globals_1.it)('should get role by name', async () => {
            const analystRole = await workflowService.getRoleByName('analyst');
            (0, globals_1.expect)(analystRole).toBeDefined();
            (0, globals_1.expect)(analystRole?.name).toBe('analyst');
            (0, globals_1.expect)(analystRole?.isSystemRole).toBe(true);
            (0, globals_1.expect)(analystRole?.permissions.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Event System', () => {
        (0, globals_1.it)('should emit events on stage transition', async () => {
            if (!testCaseId)
                return;
            let eventFired = false;
            let eventData;
            // Register event handler
            workflowService.on('case.stage_changed', async (event) => {
                eventFired = true;
                eventData = event;
            });
            // Transition stage
            await workflowService.transitionStage({
                caseId: testCaseId,
                toStage: 'analysis',
                userId: testUserId,
                reason: 'Moving to analysis for event test',
                legalBasis: 'investigation',
            }, {
                legalBasis: 'investigation',
            });
            // Wait a bit for async handler
            await new Promise((resolve) => setTimeout(resolve, 100));
            (0, globals_1.expect)(eventFired).toBe(true);
            (0, globals_1.expect)(eventData.type).toBe('case.stage_changed');
            (0, globals_1.expect)(eventData.caseId).toBe(testCaseId);
        });
    });
});
