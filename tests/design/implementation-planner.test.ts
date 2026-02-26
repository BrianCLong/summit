import {
  assertPlannerApproval,
  buildImplementationPlan,
} from '../../src/agents/design/implementation-planner';

describe('buildImplementationPlan', () => {
  it('requires approval when stack migration is proposed without authorization', () => {
    const result = buildImplementationPlan({
      designId: 'ops-console',
      screens: [
        { id: 'alerts', name: 'Alerts' },
        { id: 'home', name: 'Home' },
      ],
      currentStack: ['React', 'MUI'],
      proposedStack: ['React', 'Tailwind'],
      migrationAllowed: false,
    });

    expect(result.stackMigration).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.markdown).toContain('Human approval required: yes');
  });

  it('allows execution when no migration occurs', () => {
    expect(() =>
      assertPlannerApproval({
        designId: 'ops-console',
        screens: [{ id: 'home', name: 'Home' }],
        currentStack: ['React', 'MUI'],
        proposedStack: ['React', 'MUI'],
        migrationAllowed: false,
      }),
    ).not.toThrow();
  });
});
