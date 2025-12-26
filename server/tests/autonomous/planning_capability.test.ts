
import { describe, expect, test, jest } from '@jest/globals';
import { PlanningCapability } from '../../src/autonomous/capabilities/planning';

describe('PlanningCapability', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  };

  const createMockContext = (killSwitchValue = false) => ({
    logger: mockLogger,
    killSwitch: jest.fn().mockReturnValue(killSwitchValue),
  });

  test('should execute within bounds', async () => {
    const context = createMockContext(false);
    const result = await PlanningCapability.execute({ goal: 'test goal' }, context as any);

    expect(result).toBeDefined();
    expect(result.steps.length).toBeLessThanOrEqual(PlanningCapability.schema.limits.maxSteps || 10);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.anything(), 'Planning completed');
  });

  test('should halt immediately if killSwitch is active at start', async () => {
    const context = createMockContext(true);

    await expect(PlanningCapability.execute({ goal: 'test goal' }, context as any))
      .rejects.toThrow('Planning cancelled by kill switch');
  });

  test('should halt if killSwitch becomes active during execution', async () => {
    const context = {
      logger: mockLogger,
      killSwitch: jest.fn()
        .mockReturnValueOnce(false) // First check (start)
        .mockReturnValueOnce(false) // First loop
        .mockReturnValueOnce(true)  // Second loop -> Kill
    };

    // Override limits to ensure loop runs long enough to hit kill switch
    // Note: Since we can't easily modify the const schema in the imported module without dirty hacks,
    // we rely on the loop checking killSwitch every iteration.
    // The default implementation simulates work.

    await expect(PlanningCapability.execute({ goal: 'test goal' }, context as any))
      .rejects.toThrow('Planning cancelled by kill switch');
  });

  test('should respect maxSteps limit from schema', async () => {
    // This test relies on the internal logic of PlanningCapability using its schema limits
    // We verify the result respects the limit
    const context = createMockContext(false);
    const result = await PlanningCapability.execute({ goal: 'test goal' }, context as any);

    expect(result.steps.length).toBeLessThanOrEqual(PlanningCapability.schema.limits.maxSteps!);
  });
});
