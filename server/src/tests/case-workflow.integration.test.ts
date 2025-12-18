/**
 * Case Workflow Integration Tests
 * Tests complete case lifecycle with workflow, tasks, SLAs, and approvals
 */

import { Pool } from 'pg';
import { CaseWorkflowService } from '../cases/workflow/index.js';
import { getPostgresPool } from '../db/postgres.js';

describe('Case Workflow Integration Tests', () => {
  let pg: Pool;
  let workflowService: CaseWorkflowService;
  let testCaseId: string;
  let testUserId: string;
  let investigatorRoleId: string;

  beforeAll(async () => {
    pg = getPostgresPool();
    workflowService = new CaseWorkflowService(pg);

    // Get investigator role
    const investigatorRole = await workflowService.getRoleByName('investigator');
    if (!investigatorRole) {
      throw new Error('Investigator role not found - run migrations first');
    }
    investigatorRoleId = investigatorRole.id;

    testUserId = 'test-user-001';
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCaseId) {
      await pg.query('DELETE FROM maestro.cases WHERE id = $1', [testCaseId]);
    }
    await pg.end();
  });

  describe('Complete Case Lifecycle', () => {
    it('should create a case and manage workflow', async () => {
      // 1. Create case (using CaseRepo directly for this test)
      const { rows: caseRows } = await pg.query(
        `INSERT INTO maestro.cases (
          id, tenant_id, title, description, status, case_type, priority, created_by
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          'test-tenant',
          'Test Investigation Case',
          'Testing workflow engine',
          'open',
          'investigation',
          'high',
          testUserId,
        ],
      );

      testCaseId = caseRows[0].id;
      expect(testCaseId).toBeDefined();

      // 2. Add participant
      const participant = await workflowService.addParticipant({
        caseId: testCaseId,
        userId: testUserId,
        roleId: investigatorRoleId,
        assignedBy: 'system',
      });

      expect(participant.caseId).toBe(testCaseId);
      expect(participant.userId).toBe(testUserId);
      expect(participant.isActive).toBe(true);

      // 3. Transition to intake stage
      const transitionResult = await workflowService.transitionStage(
        {
          caseId: testCaseId,
          toStage: 'intake',
          userId: testUserId,
          reason: 'Case opened for investigation',
          legalBasis: 'investigation',
        },
        {
          legalBasis: 'investigation',
        },
      );

      expect(transitionResult.success).toBe(true);
      expect(transitionResult.newStage).toBe('intake');

      // 4. Create task
      const task = await workflowService.createTask(
        {
          caseId: testCaseId,
          title: 'Initial assessment',
          description: 'Assess the case and gather preliminary information',
          taskType: 'analysis',
          priority: 'high',
          assignedTo: testUserId,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          createdBy: testUserId,
        },
        {
          legalBasis: 'investigation',
          reason: 'Initial task for case assessment',
        },
      );

      expect(task.caseId).toBe(testCaseId);
      expect(task.status).toBe('pending');

      // 5. Complete task
      const completedTask = await workflowService.completeTask(task.id, testUserId, {
        findings: 'Preliminary investigation reveals suspicious activity',
        confidence: 0.85,
      });

      expect(completedTask?.status).toBe('completed');
      expect(completedTask?.resultData.findings).toBeDefined();

      // 6. Get SLA summary
      const slaSummary = await workflowService.getCaseSLASummary(testCaseId);
      expect(slaSummary.totalSlas).toBeGreaterThan(0);

      // 7. List tasks
      const tasks = await workflowService.listTasks({ caseId: testCaseId });
      expect(tasks.length).toBeGreaterThan(0);

      // 8. Get participants
      const participants = await workflowService.getCaseParticipants(testCaseId);
      expect(participants.length).toBe(1);
      expect(participants[0].userId).toBe(testUserId);
    });

    it('should handle 4-eyes approval workflow', async () => {
      if (!testCaseId) {
        // Create a test case if not already created
        const { rows } = await pg.query(
          `INSERT INTO maestro.cases (
            id, tenant_id, title, case_type, priority, created_by
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
          RETURNING id`,
          ['test-tenant', 'Approval Test Case', 'investigation', 'high', testUserId],
        );
        testCaseId = rows[0].id;
      }

      // 1. Request 4-eyes approval
      const approval = await workflowService.requestApproval({
        caseId: testCaseId,
        approvalType: '4-eyes',
        requestedBy: testUserId,
        reason: 'Escalation to law enforcement requires dual approval',
      });

      expect(approval.status).toBe('pending');
      expect(approval.requiredApprovers).toBe(2);

      // 2. First approver votes
      const vote1 = await workflowService.submitApprovalVote({
        approvalId: approval.id,
        approverUserId: 'approver-001',
        decision: 'approve',
        reason: 'Evidence supports escalation',
      });

      expect(vote1.decision).toBe('approve');

      // 3. Check approval status (should still be pending with 1/2 votes)
      const partialApproval = await workflowService.approvalRepo.getApproval(approval.id);
      expect(partialApproval?.status).toBe('pending'); // Not yet approved

      // 4. Second approver votes
      const vote2 = await workflowService.submitApprovalVote({
        approvalId: approval.id,
        approverUserId: 'approver-002',
        decision: 'approve',
        reason: 'Agreed, escalation warranted',
      });

      expect(vote2.decision).toBe('approve');

      // 5. Check approval status (should now be approved with 2/2 votes)
      const completedApproval = await workflowService.approvalRepo.getApproval(approval.id);
      expect(completedApproval?.status).toBe('approved');
      expect(completedApproval?.completedAt).toBeDefined();
    });

    it('should track available transitions based on role', async () => {
      if (!testCaseId) return;

      // User with investigator role should see specific transitions
      const transitions = await workflowService.getAvailableTransitions(
        testCaseId,
        testUserId,
      );

      expect(Array.isArray(transitions)).toBe(true);
      // Available transitions depend on current stage
    });

    it('should prevent invalid stage transitions', async () => {
      if (!testCaseId) return;

      // Try to transition from intake directly to completed (should fail)
      const result = await workflowService.transitionStage(
        {
          caseId: testCaseId,
          toStage: 'completed',
          userId: testUserId,
          reason: 'Attempting invalid transition',
          legalBasis: 'investigation',
        },
        {
          legalBasis: 'investigation',
        },
      );

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('SLA Management', () => {
    it('should create and track SLAs', async () => {
      if (!testCaseId) return;

      // Create a manual SLA
      const sla = await workflowService.createSLA({
        caseId: testCaseId,
        slaType: 'case_completion',
        targetHours: 168, // 7 days
      });

      expect(sla.caseId).toBe(testCaseId);
      expect(sla.status).toBe('active');
      expect(sla.targetHours).toBe(168);

      // Get all SLAs for case
      const slas = await workflowService.getCaseSLAs(testCaseId);
      expect(slas.length).toBeGreaterThan(0);

      // Get SLA summary
      const summary = await workflowService.getCaseSLASummary(testCaseId);
      expect(summary.totalSlas).toBeGreaterThan(0);
      expect(summary.activeSlas).toBeGreaterThanOrEqual(0);
    });

    it('should detect overdue tasks', async () => {
      if (!testCaseId) return;

      // Create a task that's already overdue
      const pastDueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const overdueTask = await workflowService.createTask(
        {
          caseId: testCaseId,
          title: 'Overdue task test',
          taskType: 'standard',
          priority: 'high',
          assignedTo: testUserId,
          dueDate: pastDueDate,
          createdBy: testUserId,
        },
        {
          legalBasis: 'investigation',
          reason: 'Testing overdue task detection',
        },
      );

      // Get overdue tasks
      const overdueTasks = await workflowService.getOverdueTasks(testCaseId);
      expect(overdueTasks.length).toBeGreaterThan(0);

      const foundOverdueTask = overdueTasks.find((t) => t.taskId === overdueTask.id);
      expect(foundOverdueTask).toBeDefined();
      expect(foundOverdueTask!.daysOverdue).toBeGreaterThan(0);
    });
  });

  describe('Role Management', () => {
    it('should list system roles', async () => {
      const systemRoles = await workflowService.listRoles(true);

      expect(systemRoles.length).toBeGreaterThan(0);

      const roleNames = systemRoles.map((r) => r.name);
      expect(roleNames).toContain('investigator');
      expect(roleNames).toContain('analyst');
      expect(roleNames).toContain('approver');
    });

    it('should get role by name', async () => {
      const analystRole = await workflowService.getRoleByName('analyst');

      expect(analystRole).toBeDefined();
      expect(analystRole?.name).toBe('analyst');
      expect(analystRole?.isSystemRole).toBe(true);
      expect(analystRole?.permissions.length).toBeGreaterThan(0);
    });
  });

  describe('Event System', () => {
    it('should emit events on stage transition', async () => {
      if (!testCaseId) return;

      let eventFired = false;
      let eventData: any;

      // Register event handler
      workflowService.on('case.stage_changed', async (event) => {
        eventFired = true;
        eventData = event;
      });

      // Transition stage
      await workflowService.transitionStage(
        {
          caseId: testCaseId,
          toStage: 'analysis',
          userId: testUserId,
          reason: 'Moving to analysis for event test',
          legalBasis: 'investigation',
        },
        {
          legalBasis: 'investigation',
        },
      );

      // Wait a bit for async handler
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(eventFired).toBe(true);
      expect(eventData.type).toBe('case.stage_changed');
      expect(eventData.caseId).toBe(testCaseId);
    });
  });
});
