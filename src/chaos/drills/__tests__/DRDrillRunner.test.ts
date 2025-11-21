/**
 * @fileoverview Tests for DRDrillRunner
 */

import { DRDrillRunner, DRDrillConfig, PREDEFINED_DRILLS } from '../DRDrillRunner';

describe('DRDrillRunner', () => {
  let runner: DRDrillRunner;

  beforeEach(() => {
    runner = new DRDrillRunner('/home/user/summit', './backups');
  });

  describe('createDrillConfig', () => {
    it('should create a valid drill config for total_data_loss', () => {
      const config = DRDrillRunner.createDrillConfig('total_data_loss');

      expect(config.type).toBe('total_data_loss');
      expect(config.objectives.rtoTarget).toBe(14400); // 4 hours
      expect(config.objectives.rpoTarget).toBe(900); // 15 minutes
      expect(config.backupSet).toBe('minimal');
      expect(config.restoreEnvironment).toBe('dr_rehearsal');
      expect(config.validationTests.length).toBeGreaterThan(0);
    });

    it('should create configs for all predefined drill types', () => {
      const drillTypes = Object.values(PREDEFINED_DRILLS);

      for (const type of drillTypes) {
        const config = DRDrillRunner.createDrillConfig(type);
        expect(config.type).toBe(type);
        expect(config.id).toContain(type);
      }
    });

    it('should allow overriding default config values', () => {
      const config = DRDrillRunner.createDrillConfig('backup_validation', {
        backupSet: 'full',
        dryRun: true,
        objectives: {
          rtoTarget: 7200, // 2 hours
          rpoTarget: 300, // 5 minutes
          compliant: false,
        },
      });

      expect(config.backupSet).toBe('full');
      expect(config.dryRun).toBe(true);
      expect(config.objectives.rtoTarget).toBe(7200);
      expect(config.objectives.rpoTarget).toBe(300);
    });
  });

  describe('DRDrillRunner instance', () => {
    it('should be an EventEmitter', () => {
      expect(typeof runner.on).toBe('function');
      expect(typeof runner.emit).toBe('function');
    });

    it('should emit events during drill execution', async () => {
      const events: string[] = [];

      runner.on('drill:start', () => events.push('start'));
      runner.on('phase:start', () => events.push('phase:start'));
      runner.on('drill:complete', () => events.push('complete'));
      runner.on('drill:failed', () => events.push('failed'));

      // Create a dry run config
      const config = DRDrillRunner.createDrillConfig('backup_validation', {
        dryRun: true,
      });

      try {
        await runner.executeDrill(config);
      } catch {
        // Expected to fail in test environment without docker
      }

      expect(events).toContain('start');
    });
  });

  describe('RecoveryObjectives', () => {
    it('should have RTO target of 4 hours (14400 seconds)', () => {
      const config = DRDrillRunner.createDrillConfig('total_data_loss');
      expect(config.objectives.rtoTarget).toBe(14400);
    });

    it('should have RPO target of 15 minutes (900 seconds)', () => {
      const config = DRDrillRunner.createDrillConfig('total_data_loss');
      expect(config.objectives.rpoTarget).toBe(900);
    });
  });

  describe('ValidationTests', () => {
    it('should include required health checks', () => {
      const config = DRDrillRunner.createDrillConfig('total_data_loss');
      const requiredTests = config.validationTests.filter((t) => t.required);

      expect(requiredTests.length).toBeGreaterThan(0);
      expect(requiredTests.some((t) => t.name.includes('postgres'))).toBe(true);
      expect(requiredTests.some((t) => t.name.includes('neo4j'))).toBe(true);
    });

    it('should include data integrity test', () => {
      const config = DRDrillRunner.createDrillConfig('total_data_loss');
      const integrityTest = config.validationTests.find(
        (t) => t.type === 'data_integrity'
      );

      expect(integrityTest).toBeDefined();
      expect(integrityTest?.required).toBe(true);
    });
  });

  describe('BackupSets', () => {
    const backupSets = ['full', 'minimal', 'tenant', 'project', 'config_only', 'disaster_recovery'];

    it.each(backupSets)('should support %s backup set', (backupSet) => {
      const config = DRDrillRunner.createDrillConfig('backup_validation', {
        backupSet: backupSet as any,
      });

      expect(config.backupSet).toBe(backupSet);
    });
  });

  describe('RestoreEnvironments', () => {
    const environments = ['production', 'staging', 'dr_rehearsal', 'dev', 'test'];

    it.each(environments)('should support %s environment', (env) => {
      const config = DRDrillRunner.createDrillConfig('backup_validation', {
        restoreEnvironment: env as any,
      });

      expect(config.restoreEnvironment).toBe(env);
    });
  });
});
