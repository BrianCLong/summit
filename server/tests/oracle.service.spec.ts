// server/tests/oracle.service.spec.ts
import { OracleService } from '../src/oracle/OracleService';
import { SimulationParameters } from '../src/oracle/oracle.types';

// Mock setTimeout to resolve immediately for testing async background tasks
jest.useFakeTimers();

describe('OracleService', () => {
  let oracleService: OracleService;

  beforeEach(() => {
    oracleService = new OracleService();
  });

  it('should initiate a simulation run and return a running status', async () => {
    const params: SimulationParameters = {
      narrativeQuery: 'Test query',
      horizonDays: 90,
      eventSigmaThreshold: 4,
      simulationCount: 1000,
    };
    const run = await oracleService.runCausalLoop(params);
    expect(run).toBeDefined();
    expect(run.status).toBe('running');
    expect(run.params).toEqual(params);
  });

  it('should complete a simulation run and generate prophetic truths', async () => {
    const params: SimulationParameters = {
      narrativeQuery: 'Another test query',
      horizonDays: 30,
      eventSigmaThreshold: 5,
      simulationCount: 5000,
    };
    const initialRun = await oracleService.runCausalLoop(params);
    const runId = initialRun.runId;

    // Fast-forward timers to simulate the passage of time for the async simulation
    await jest.runAllTimersAsync();

    const completedRun = await oracleService.getVerifiedTimeline(runId);
    expect(completedRun).toBeDefined();
    expect(completedRun?.status).toBe('complete');
    expect(completedRun?.validatedTruths).toHaveLength(2);
    expect(completedRun?.validatedTruths[0].status).toBe('validated');
  });

  it('should return undefined for a non-existent simulation run', async () => {
    const timeline = await oracleService.getVerifiedTimeline('non-existent-id');
    expect(timeline).toBeUndefined();
  });
});
