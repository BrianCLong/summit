
import { investigationWorkflowService } from '../src/services/investigationWorkflowService';

describe('Investigation Workflow Service - Tenant Isolation', () => {
  const tenantA = 'tenant-a-uuid';
  const tenantB = 'tenant-b-uuid';
  const userA = 'user-a';
  const userB = 'user-b';

  beforeEach(() => {
    // Reset service state if possible, or just create unique IDs
  });

  it('should allow a user to create and retrieve their own investigation', async () => {
    const investigation = await investigationWorkflowService.createInvestigation(
      'template-security-incident',
      {
        tenantId: tenantA,
        name: 'Incident Alpha',
        priority: 'HIGH',
        assignedTo: [userA],
        createdBy: userA,
      }
    );

    expect(investigation).toBeDefined();
    expect(investigation.tenantId).toBe(tenantA);

    const retrieved = await investigationWorkflowService.getInvestigation(investigation.id, tenantA);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(investigation.id);
  });

  it('should NOT allow a user from Tenant B to retrieve Tenant A investigation', async () => {
    // 1. Create investigation as Tenant A
    const investigationA = await investigationWorkflowService.createInvestigation(
      'template-security-incident',
      {
        tenantId: tenantA,
        name: 'Secret Incident A',
        priority: 'CRITICAL',
        assignedTo: [userA],
        createdBy: userA,
      }
    );

    // 2. Try to retrieve as Tenant B
    const retrievedB = await investigationWorkflowService.getInvestigation(investigationA.id, tenantB);

    // 3. Expect null (Not Found) or Error
    expect(retrievedB).toBeNull();
  });

  it('should NOT allow a user from Tenant B to modify Tenant A investigation', async () => {
    // 1. Create investigation as Tenant A
    const investigationA = await investigationWorkflowService.createInvestigation(
      'template-security-incident',
      {
        tenantId: tenantA,
        name: 'Immutable Incident A',
        priority: 'MEDIUM',
        assignedTo: [userA],
        createdBy: userA,
      }
    );

    // 2. Try to advance workflow as Tenant B
    await expect(
        investigationWorkflowService.advanceWorkflowStage(investigationA.id, userB, tenantB)
    ).rejects.toThrow(/Unauthorized/);
  });

  it('should filter getAllInvestigations by tenant', async () => {
     // Create one for A
     await investigationWorkflowService.createInvestigation(
        'template-security-incident',
        { tenantId: tenantA, name: 'List A', priority: 'LOW', assignedTo: [userA], createdBy: userA }
      );

      // Create one for B
      await investigationWorkflowService.createInvestigation(
        'template-security-incident',
        { tenantId: tenantB, name: 'List B', priority: 'LOW', assignedTo: [userB], createdBy: userB }
      );

      const listA = investigationWorkflowService.getAllInvestigations(tenantA);
      const listB = investigationWorkflowService.getAllInvestigations(tenantB);

      expect(listA.length).toBeGreaterThanOrEqual(1);
      expect(listA.every(i => i.tenantId === tenantA)).toBe(true);

      expect(listB.length).toBeGreaterThanOrEqual(1);
      expect(listB.every(i => i.tenantId === tenantB)).toBe(true);

      // Ensure no intersection in this simple check (IDs shouldn't overlap)
      const idsA = listA.map(i => i.id);
      const idsB = listB.map(i => i.id);
      const intersection = idsA.filter(id => idsB.includes(id));
      expect(intersection).toEqual([]);
  });
});
