import { PlaybookEngine } from '../soar/PlaybookEngine';

describe('playbook engine', () => {
  it('runs steps with dry-run default', async () => {
    const engine = new PlaybookEngine({});
    const pb = { spec: { steps: [{ id: 's1', action: 'a1' }] } } as any;
    const res = await engine.run(pb, {}, { tenantId: 't', dryRunDefault: true });
    expect(res[0].status).toBe('dry-run');
  });
});
