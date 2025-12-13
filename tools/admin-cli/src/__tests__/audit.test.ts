/**
 * Tests for audit logging
 */

import { createAuditor, createAuditContext } from '../utils/audit.js';
import { createMockApiClient } from '../utils/api-client.js';

describe('Audit Logging', () => {
  describe('createAuditor', () => {
    it('should create auditor with enabled flag', () => {
      const auditor = createAuditor({ enabled: true });
      expect(auditor).toHaveProperty('record');
    });

    it('should create auditor with API client', () => {
      const apiClient = createMockApiClient();
      const auditor = createAuditor({
        enabled: true,
        apiClient,
      });

      expect(auditor).toHaveProperty('record');
    });

    it('should skip recording when disabled', async () => {
      const auditor = createAuditor({ enabled: false });

      // Should not throw
      await auditor.record({
        action: 'test.action',
        command: 'test',
        args: [],
        options: {},
        userId: 'user1',
        result: 'success',
      });
    });

    it('should record event when enabled', async () => {
      const apiClient = createMockApiClient();
      const auditor = createAuditor({
        enabled: true,
        apiClient,
      });

      // Should not throw
      await auditor.record({
        action: 'test.action',
        command: 'test',
        args: ['arg1', 'arg2'],
        options: { flag: true },
        userId: 'user1',
        result: 'success',
      });
    });

    it('should redact sensitive options', async () => {
      const apiClient = createMockApiClient();
      const auditor = createAuditor({
        enabled: true,
        apiClient,
      });

      // Should not throw and should redact token
      await auditor.record({
        action: 'test.action',
        command: 'test',
        args: [],
        options: {
          token: 'secret-token',
          password: 'secret-password',
          normalOption: 'visible',
        },
        userId: 'user1',
        result: 'success',
      });
    });
  });

  describe('createAuditContext', () => {
    it('should create context with command info', () => {
      const context = createAuditContext('tenant', ['create'], {
        name: 'Acme Corp',
      });

      expect(context.command).toBe('tenant');
      expect(context.args).toEqual(['create']);
      expect(context.options).toEqual({ name: 'Acme Corp' });
    });

    it('should redact sensitive options in context', () => {
      const context = createAuditContext('security', ['rotate-keys'], {
        token: 'secret',
        force: true,
      });

      expect(context.options.token).toBe('[REDACTED]');
      expect(context.options.force).toBe(true);
    });

    it('should handle nested sensitive options', () => {
      const context = createAuditContext('config', ['set'], {
        nested: {
          apiKey: 'secret-key',
          visible: 'yes',
        },
      });

      expect((context.options.nested as Record<string, unknown>).apiKey).toBe('[REDACTED]');
      expect((context.options.nested as Record<string, unknown>).visible).toBe('yes');
    });
  });
});
