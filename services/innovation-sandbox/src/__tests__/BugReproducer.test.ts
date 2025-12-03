import { describe, it, expect } from 'vitest';
import { BugReproducer } from '../repro/BugReproducer.js';

describe('BugReproducer', () => {
  it('reproduces timeout issue', async () => {
    const reproducer = new BugReproducer({
      quotas: {
        cpuMs: 1000,
        memoryMb: 128,
        wallClockMs: 200, // Short timeout for test
        maxOutputBytes: 1024,
        maxNetworkBytes: 0
      }
    });
    const result = await reproducer.reproduce('The application hangs and eventually times out');

    expect(result.script).toContain('setTimeout');
    expect(result.executionResult.status).toBe('timeout');
    expect(result.reproduced).toBe(true);
  });

  it('reproduces crash issue', async () => {
    const reproducer = new BugReproducer();
    const result = await reproducer.reproduce('It crashes with an error');

    expect(result.script).toContain('throw new Error');
    // Depending on how SecureSandbox handles throws, it might be 'error'
    expect(result.executionResult.status).toBe('error');
    expect(result.reproduced).toBe(true);
  });

  it('fails to reproduce unknown issue', async () => {
    const reproducer = new BugReproducer();
    const result = await reproducer.reproduce('Just a feature request');

    expect(result.executionResult.status).toBe('success');
    expect(result.reproduced).toBe(false);
  });
});
