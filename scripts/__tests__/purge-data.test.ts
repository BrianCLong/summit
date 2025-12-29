
import { parseArgs, runPurge } from '../purge-data.js';
import { jest } from '@jest/globals';

// Mock console.log and console.error to avoid cluttering output and to verify calls
const mockLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('purge-data script', () => {
  beforeEach(() => {
    mockLog.mockClear();
    mockError.mockClear();
  });

  describe('parseArgs', () => {
    test('should parse --execute flag', () => {
      const options = parseArgs(['--execute']);
      expect(options.execute).toBe(true);
    });

    test('should default to dry-run (execute=false)', () => {
      const options = parseArgs([]);
      expect(options.execute).toBe(false);
    });

    test('should parse --older-than', () => {
      const options = parseArgs(['--older-than', '30']);
      expect(options.olderThanDays).toBe(30);
    });

    test('should handle missing value for --older-than', () => {
      const options = parseArgs(['--older-than']);
      expect(options.olderThanDays).toBeNull();
    });

    test('should handle invalid value for --older-than', () => {
      const options = parseArgs(['--older-than', 'abc']);
      expect(options.olderThanDays).toBeNull();
    });
  });

  describe('runPurge', () => {
    test('should throw error if olderThanDays is null', () => {
      expect(() => {
        runPurge({ olderThanDays: null, execute: false });
      }).toThrow('--older-than <days> is required');
      expect(mockError).toHaveBeenCalledWith('Error: --older-than <days> is required.');
    });

    test('should run in dry-run mode by default', () => {
      runPurge({ olderThanDays: 30, execute: false });
      expect(mockLog).toHaveBeenCalledWith('Configuration: Older Than = 30 days');
      expect(mockLog).toHaveBeenCalledWith('Mode: DRY-RUN');
      expect(mockLog).toHaveBeenCalledWith('[DRY-RUN] Would search for receipts/provenance older than 30 days.');
    });

    test('should run in execute mode when execute is true', () => {
      runPurge({ olderThanDays: 60, execute: true });
      expect(mockLog).toHaveBeenCalledWith('Configuration: Older Than = 60 days');
      expect(mockLog).toHaveBeenCalledWith('Mode: EXECUTE');
      expect(mockLog).toHaveBeenCalledWith('[EXECUTE] Searching for receipts/provenance older than 60 days...');
    });
  });
});
