import { describe, it, expect } from 'vitest';
import { evaluatePolicy, redactSecrets } from '../policy';
import { runHooks } from '../runner';

describe('Hook Policy', () => {
  it('should deny raw shell by default', () => {
    const event = { tool: 'shell', toolInput: 'rm -rf /' };
    const decision = evaluatePolicy(event);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('denied by default');
  });

  it('should allow internal commands in allowlist', () => {
    const event = { tool: 'internal', commandId: 'ls-safe', toolInput: {} };
    const config = { allowlist: ['ls-safe'] };
    const decision = evaluatePolicy(event, config);
    expect(decision.allowed).toBe(true);
  });

  it('should deny internal commands NOT in allowlist', () => {
    const event = {
      tool: 'internal',
      commandId: 'format-hard-drive',
      toolInput: {},
    };
    const config = { allowlist: ['ls-safe'] };
    const decision = evaluatePolicy(event, config);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('not in the allowlist');
  });

  it('should redact secrets from input', () => {
    const input = { API_KEY: 'secret-123', publicField: 'data' };
    const redacted = redactSecrets(input);
    expect(redacted.API_KEY).toBe('[REDACTED]');
    expect(redacted.publicField).toBe('data');
  });

  it('should redact secrets from nested input', () => {
    const input = { config: { PASSWORD: 'pass' }, public: 1 };
    const redacted = redactSecrets(input);
    expect(redacted.config.PASSWORD).toBe('[REDACTED]');
  });

  it('should redact secrets from root-level arrays', () => {
    const input = [{ PASSWORD: 'pass1' }, { TOKEN: 'pass2', public: 'data' }];
    const redacted = redactSecrets(input);
    expect(redacted[0].PASSWORD).toBe('[REDACTED]');
    expect(redacted[1].TOKEN).toBe('[REDACTED]');
    expect(redacted[1].public).toBe('data');
  });
});

describe('Hook Runner', () => {
  it('should not run denied hooks and provide audit log', async () => {
    const event = { tool: 'shell', toolInput: { cmd: 'bad' } };
    const result = await runHooks(event, {});
    expect(result.ran).toBe(false);
    expect(result.audit.decision).toBe('DENIED');
  });

  it('should run allowed hooks', async () => {
    const event = { tool: 'internal', commandId: 'ok', toolInput: {} };
    const config = { allowlist: ['ok'] };
    const result = await runHooks(event, config);
    expect(result.ran).toBe(true);
    expect(result.audit.decision).toBe('ALLOWED');
  });
});
