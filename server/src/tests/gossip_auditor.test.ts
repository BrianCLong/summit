import { GossipAuditor } from '../transparency/GossipAuditor';

describe('GossipAuditor', () => {
  it('alerts on fork', async () => {
    const alerts: string[] = [];
    const auditor = new GossipAuditor(
      {
        getSTH: async () => ({ size: 1, root: 'a' }),
        getRange: async () => ['b'],
      },
      { alert: (m: string) => alerts.push(m) }
    );
    const res = await auditor.auditOnce();
    expect(res.ok).toBe(false);
    expect(alerts).toEqual(['transparency_log_mismatch']);
  });
});
