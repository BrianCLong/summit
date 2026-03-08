// server/tests/zero_day.service.spec.ts
import { ZeroDayService } from '../src/zero_day/ZeroDayService';

jest.useFakeTimers();

describe('ZeroDayService', () => {
  let zeroDayService: ZeroDayService;

  beforeEach(() => {
    zeroDayService = new ZeroDayService();
  });

  it('should initialize with the redacted log', async () => {
    const log = await zeroDayService.getKillChainStatus('zd-threat-redacted-001');
    expect(log).toBeDefined();
    expect(log?.status).toBe('completed');
  });

  it('should designate a new threat and create a pending kill chain', async () => {
    const analysis = 'A new existential threat has been detected.';
    const log = await zeroDayService.designateExistentialThreat(analysis);
    expect(log).toBeDefined();
    expect(log.status).toBe('pending_delegation');
    expect(log.delegationId).toBe('');
  });

  it('should delegate authority and activate the kill chain', async () => {
    const analysis = 'Another threat.';
    const initialLog = await zeroDayService.designateExistentialThreat(analysis);
    const threatId = initialLog.threatId;

    const activatedLog = await zeroDayService.delegateAutonomousAuthority(threatId, 'operator-007');
    expect(activatedLog.status).toBe('active');
    expect(activatedLog.delegationId).not.toBe('');
    expect(activatedLog.activationTimestamp).toBeDefined();
  });

  it('should execute the kill chain to completion after delegation', async () => {
    const analysis = 'A critical threat.';
    const initialLog = await zeroDayService.designateExistentialThreat(analysis);
    const threatId = initialLog.threatId;

    await zeroDayService.delegateAutonomousAuthority(threatId, 'operator-001');

    // Allow the simulated async execution to run
    await jest.runAllTimersAsync();

    const completedLog = await zeroDayService.getKillChainStatus(threatId);
    expect(completedLog?.status).toBe('completed');
    expect(completedLog?.completionTimestamp).toBeDefined();
    expect(completedLog?.actions).toHaveLength(3);
    expect(completedLog?.actions.map(a => a.actionType)).toEqual([
      'satellite_retasking',
      'drone_swarm_launch',
      'railgun_strike'
    ]);
  });

  it('should throw an error when delegating authority for a non-pending threat', async () => {
    await expect(zeroDayService.delegateAutonomousAuthority('zd-threat-redacted-001', 'op-1')).rejects.toThrow(
      'Threat zd-threat-redacted-001 is not awaiting delegation or does not exist.',
    );
  });
});
