/**
 * Tests for CLI program
 */

import { createProgram } from '../cli.js';

describe('CLI Program', () => {
  let program: ReturnType<typeof createProgram>;

  beforeEach(() => {
    program = createProgram();
  });

  describe('program setup', () => {
    it('should create program with correct name', () => {
      expect(program.name()).toBe('summit-admin');
    });

    it('should have version set', () => {
      expect(program.version()).toBeTruthy();
    });

    it('should have description set', () => {
      // Commander stores description internally
      expect(program.description()).toContain('Admin');
    });
  });

  describe('global options', () => {
    it('should have endpoint option', () => {
      const option = program.options.find((o) => o.long === '--endpoint');
      expect(option).toBeDefined();
    });

    it('should have token option', () => {
      const option = program.options.find((o) => o.long === '--token');
      expect(option).toBeDefined();
    });

    it('should have profile option', () => {
      const option = program.options.find((o) => o.long === '--profile');
      expect(option).toBeDefined();
    });

    it('should have format option', () => {
      const option = program.options.find((o) => o.long === '--format');
      expect(option).toBeDefined();
    });

    it('should have verbose option', () => {
      const option = program.options.find((o) => o.long === '--verbose');
      expect(option).toBeDefined();
    });

    it('should have dry-run option', () => {
      const option = program.options.find((o) => o.long === '--dry-run');
      expect(option).toBeDefined();
    });
  });

  describe('commands', () => {
    it('should have env command', () => {
      const cmd = program.commands.find((c) => c.name() === 'env');
      expect(cmd).toBeDefined();
    });

    it('should have tenant command', () => {
      const cmd = program.commands.find((c) => c.name() === 'tenant');
      expect(cmd).toBeDefined();
    });

    it('should have data command', () => {
      const cmd = program.commands.find((c) => c.name() === 'data');
      expect(cmd).toBeDefined();
    });

    it('should have security command', () => {
      const cmd = program.commands.find((c) => c.name() === 'security');
      expect(cmd).toBeDefined();
    });

    it('should have graph command', () => {
      const cmd = program.commands.find((c) => c.name() === 'graph');
      expect(cmd).toBeDefined();
    });

    it('should have config command', () => {
      const cmd = program.commands.find((c) => c.name() === 'config');
      expect(cmd).toBeDefined();
    });
  });

  describe('env subcommands', () => {
    it('should have status subcommand', () => {
      const env = program.commands.find((c) => c.name() === 'env');
      const status = env?.commands.find((c) => c.name() === 'status');
      expect(status).toBeDefined();
    });

    it('should have health subcommand', () => {
      const env = program.commands.find((c) => c.name() === 'env');
      const health = env?.commands.find((c) => c.name() === 'health');
      expect(health).toBeDefined();
    });

    it('should have services subcommand', () => {
      const env = program.commands.find((c) => c.name() === 'env');
      const services = env?.commands.find((c) => c.name() === 'services');
      expect(services).toBeDefined();
    });

    it('should have slo subcommand', () => {
      const env = program.commands.find((c) => c.name() === 'env');
      const slo = env?.commands.find((c) => c.name() === 'slo');
      expect(slo).toBeDefined();
    });
  });

  describe('tenant subcommands', () => {
    it('should have list subcommand', () => {
      const tenant = program.commands.find((c) => c.name() === 'tenant');
      const list = tenant?.commands.find((c) => c.name() === 'list');
      expect(list).toBeDefined();
    });

    it('should have create subcommand', () => {
      const tenant = program.commands.find((c) => c.name() === 'tenant');
      const create = tenant?.commands.find((c) => c.name() === 'create');
      expect(create).toBeDefined();
    });

    it('should have suspend subcommand', () => {
      const tenant = program.commands.find((c) => c.name() === 'tenant');
      const suspend = tenant?.commands.find((c) => c.name() === 'suspend');
      expect(suspend).toBeDefined();
    });

    it('should have export-metadata subcommand', () => {
      const tenant = program.commands.find((c) => c.name() === 'tenant');
      const exportMeta = tenant?.commands.find((c) => c.name() === 'export-metadata');
      expect(exportMeta).toBeDefined();
    });
  });

  describe('data subcommands', () => {
    it('should have backfill subcommand', () => {
      const data = program.commands.find((c) => c.name() === 'data');
      const backfill = data?.commands.find((c) => c.name() === 'backfill');
      expect(backfill).toBeDefined();
    });

    it('should have reindex subcommand', () => {
      const data = program.commands.find((c) => c.name() === 'data');
      const reindex = data?.commands.find((c) => c.name() === 'reindex');
      expect(reindex).toBeDefined();
    });

    it('should have verify-integrity subcommand', () => {
      const data = program.commands.find((c) => c.name() === 'data');
      const verify = data?.commands.find((c) => c.name() === 'verify-integrity');
      expect(verify).toBeDefined();
    });
  });

  describe('security subcommands', () => {
    it('should have rotate-keys subcommand', () => {
      const security = program.commands.find((c) => c.name() === 'security');
      const rotate = security?.commands.find((c) => c.name() === 'rotate-keys');
      expect(rotate).toBeDefined();
    });

    it('should have check-policies subcommand', () => {
      const security = program.commands.find((c) => c.name() === 'security');
      const check = security?.commands.find((c) => c.name() === 'check-policies');
      expect(check).toBeDefined();
    });

    it('should have audit subcommand', () => {
      const security = program.commands.find((c) => c.name() === 'security');
      const audit = security?.commands.find((c) => c.name() === 'audit');
      expect(audit).toBeDefined();
    });
  });

  describe('graph subcommands', () => {
    it('should have stats subcommand', () => {
      const graph = program.commands.find((c) => c.name() === 'graph');
      const stats = graph?.commands.find((c) => c.name() === 'stats');
      expect(stats).toBeDefined();
    });

    it('should have health subcommand', () => {
      const graph = program.commands.find((c) => c.name() === 'graph');
      const health = graph?.commands.find((c) => c.name() === 'health');
      expect(health).toBeDefined();
    });

    it('should have query subcommand', () => {
      const graph = program.commands.find((c) => c.name() === 'graph');
      const query = graph?.commands.find((c) => c.name() === 'query');
      expect(query).toBeDefined();
    });
  });
});
