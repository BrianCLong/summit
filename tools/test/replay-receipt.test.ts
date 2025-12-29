import { ReplaySimulator } from '../replay-receipt';
// Remove specific @jest/globals import and rely on global Jest environment
// which is standard for many setups, or try to fix the import if globals are not available.
// Given the error, it seems @types/jest might not be picking up correctly or module resolution is strict.
// But we installed @types/jest.
// Let's try using global `describe`, `it`, `expect` which jest provides by default in test environment.

// However, if we are in a module environment, we might need imports.
// The error `Cannot find module '@jest/globals'` suggests it's not resolved.
// Let's try `import { jest } from '@jest/globals'` again but check if we can point to the right place?
// No, standard jest usage is globals.

declare const describe: any;
declare const it: any;
declare const expect: any;
declare const jest: any;
declare const afterEach: any;

describe('ReplaySimulator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should replay N times and verify idempotency behavior', async () => {
    // 1. Setup Mock Submitter
    // Return success on first call, duplicate on subsequent
    const mockSubmitter = jest.fn();

    // Type checking for jest mock implementations is simpler with 'any' when types are tricky in plain files
    (mockSubmitter as any)
      .mockResolvedValueOnce({ status: 'success', message: 'First' })
      .mockResolvedValue({ status: 'duplicate', message: 'Dup' });

    // 2. Initialize Simulator
    const simulator = new ReplaySimulator(mockSubmitter as any);

    // 3. Run Replay (N=5)
    const result = await simulator.run(5, 'test-seed');

    // 4. Verification
    // Should call submitter 5 times
    expect(mockSubmitter).toHaveBeenCalledTimes(5);

    // Should use the same payload for all calls
    const firstCallArg = (mockSubmitter as any).mock.calls[0][0];
    for (let i = 1; i < 5; i++) {
        expect((mockSubmitter as any).mock.calls[i][0]).toEqual(firstCallArg);
    }

    // Check report
    expect(result).toEqual(expect.objectContaining({
        totalAttempts: 5,
        success: 1,
        duplicates: 4,
        errors: 0,
        seed: 'test-seed'
    }));
  });

  it('should handle errors gracefully', async () => {
     const mockSubmitter = jest.fn();
     (mockSubmitter as any).mockRejectedValue(new Error('Network error'));

     const simulator = new ReplaySimulator(mockSubmitter as any);
     const result = await simulator.run(3, 'error-seed');

     expect(mockSubmitter).toHaveBeenCalledTimes(3);
     expect(result.errors).toBe(3);
  });
});
