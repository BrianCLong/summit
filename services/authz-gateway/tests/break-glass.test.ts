import { BreakGlassManager } from '../src/break-glass';
import { sessionManager } from '../src/session';
import * as audit from '../src/audit';

describe('BreakGlassManager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    sessionManager.clear();
    process.env.BREAK_GLASS = '1';
  });

  afterEach(() => {
    jest.useRealTimers();
    sessionManager.clear();
    delete process.env.BREAK_GLASS;
  });

  it('expires elevated sessions and audits the expiry', async () => {
    const manager = new BreakGlassManager({ now: () => Date.now() });
    const auditSpy = jest
      .spyOn(audit, 'log')
      .mockImplementation(() => undefined);
    const token = await sessionManager.createSession({
      sub: 'alice',
      tenantId: 'tenantA',
      roles: ['reader'],
    });
    const { session } = await sessionManager.validate(token);
    await manager.grant({
      sid: session.sid,
      reason: 'incident',
      role: 'oncall-admin',
      requestedBy: 'pagerduty-oncall',
      durationSeconds: 1,
    });
    expect(manager.listActive()).toHaveLength(1);

    jest.setSystemTime(new Date(Date.now() + 2000));
    const active = manager.listActive();
    expect(active).toHaveLength(0);
    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'break_glass_expired' }),
    );
    auditSpy.mockRestore();
  });
});
