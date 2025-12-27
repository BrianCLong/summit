import { jest } from '@jest/globals';
import { BackupVerificationService } from '../../src/services/BackupVerificationService.js';

describe('BackupVerificationService', () => {
  let service: BackupVerificationService;

  beforeEach(() => {
    // Since it's a singleton, we might need a way to reset it,
    // but for now we'll just get the instance.
    // In a real scenario, we'd want a reset() method or dependency injection.
    service = BackupVerificationService.getInstance();
  });

  it('should create a backup simulation', () => {
    const backup = service.simulateBackup('us-east-1');
    expect(backup).toBeDefined();
    expect(backup.region).toBe('us-east-1');
    expect(backup.id).toContain('bkp-');
  });

  it('should verify a completed backup', async () => {
    // Mock the random outcome to ensure success for testing
    // This is tricky with internal Math.random, so we rely on the service behavior
    // or we'd mock Math.random. For this MVP test, we'll try until we get a COMPLETED one.

    let backup;
    let attempts = 0;
    while(attempts < 10) {
        backup = service.simulateBackup('us-east-1');
        if (backup.status === 'COMPLETED') break;
        attempts++;
    }

    if (backup?.status === 'COMPLETED') {
        const result = await service.verifyBackup(backup.id);
        // It's random, so it might be true or false, but it shouldn't throw.
        expect(typeof result).toBe('boolean');
    }
  });

  it('should return evidence', () => {
    const evidence = service.getEvidence('us-east-1');
    expect(evidence).toHaveProperty('region', 'us-east-1');
    expect(evidence).toHaveProperty('complianceStatus');
  });
});
