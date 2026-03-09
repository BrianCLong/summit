import { describe, it, expect, vi } from 'vitest';
import { SigningService } from '../signing.js';
import { PluginContext } from '../plugin-context.js';
import { wireAuditEvents, AuditLogger, AuditableService } from '../audit-wiring.js';

describe('Security Package', () => {
  const signingService = new SigningService();

  describe('SigningService', () => {
    it('should generate key pair and sign/verify successfully', async () => {
      const { publicKey, privateKey } = await signingService.generateKeyPair();
      const payload = Buffer.from('test-payload');
      const signature = await signingService.sign(payload, privateKey);

      expect(signingService.verify(payload, signature, publicKey)).toBe(true);
    });

    it('should fail verification for tampered payload', async () => {
      const { publicKey, privateKey } = await signingService.generateKeyPair();
      const payload = Buffer.from('test-payload');
      const signature = await signingService.sign(payload, privateKey);

      expect(signingService.verify(Buffer.from('tampered'), signature, publicKey)).toBe(false);
    });
  });

  describe('PluginContext', () => {
    it('should issue and verify capability tokens', async () => {
      const { publicKey, privateKey } = await signingService.generateKeyPair();
      const context = new PluginContext(signingService);
      const token = await context.issueCapabilityToken('plugin-1', ['read', 'write'], privateKey);

      expect(context.verifyToken(token, publicKey)).toBe(true);
      expect(token.pluginId).toBe('plugin-1');
      expect(token.capabilities).toContain('read');
    });

    it('should reject expired tokens', async () => {
      const { publicKey, privateKey } = await signingService.generateKeyPair();
      const context = new PluginContext(signingService);
      const token = await context.issueCapabilityToken('plugin-1', [], privateKey, -1000);

      expect(context.verifyToken(token, publicKey)).toBe(false);
    });
  });

  describe('AuditWiring', () => {
    it('should log audit events for wrapped methods', async () => {
      const logger: AuditLogger = { log: vi.fn() };
      const service: AuditableService = {
        name: 'test-service',
        invoke: async (data: string) => `echo: ${data}`,
      };

      wireAuditEvents(logger, service);
      const result = await service.invoke('hello');

      expect(result).toBe('echo: hello');
      expect(logger.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'invoke',
        resource: 'test-service',
        outcome: 'success',
        metadata: expect.objectContaining({ args: ['hello'] })
      }));
    });

    it('should log failure on error', async () => {
      const logger: AuditLogger = { log: vi.fn() };
      const service: AuditableService = {
        name: 'fail-service',
        execute: async () => { throw new Error('boom'); },
      };

      wireAuditEvents(logger, service);
      await expect(service.execute()).rejects.toThrow('boom');

      expect(logger.log).toHaveBeenCalledWith(expect.objectContaining({
        action: 'execute',
        outcome: 'failure',
        metadata: expect.objectContaining({ error: 'boom' })
      }));
    });
  });
});
