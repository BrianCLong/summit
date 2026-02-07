import { AttackerPlanner } from '../../src/agents/ren/deg/attacker_planner';

describe('Security: No FOIA Templates', () => {
  it('should NOT generate FOIA request text', async () => {
    const attacker = new AttackerPlanner();
    const insights = await attacker.planAttack({});

    const json = JSON.stringify(insights);
    expect(json).not.toMatch(/Dear FOIA Officer/i);
    expect(json).not.toMatch(/Freedom of Information Act/i);
    expect(json).not.toMatch(/requesting records/i);
  });
});
