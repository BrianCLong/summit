
import { QuietExitService } from '../../src/services/QuietExitService';
import fs from 'fs';
import path from 'path';

jest.mock('fs');
jest.mock('pino', () => () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('QuietExitService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should not execute if SUMMIT_QUIET_EXIT is not "true"', async () => {
    process.env.SUMMIT_QUIET_EXIT = 'false';
    const writeSpy = jest.spyOn(fs, 'writeFileSync');

    await QuietExitService.executeIfRequested();

    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('should execute if SUMMIT_QUIET_EXIT is "true"', async () => {
    process.env.SUMMIT_QUIET_EXIT = 'true';
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    // We mock globals for the "wipeMemory" part if needed, but it's guarded.

    await QuietExitService.executeIfRequested();

    expect(writeSpy).toHaveBeenCalled();
    const args = writeSpy.mock.calls[0];
    expect(args[0]).toContain('stix_thank_you.json');
    expect(args[1]).toContain('The system has left the building.');
  });
});
