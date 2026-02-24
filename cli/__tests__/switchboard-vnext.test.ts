/**
 * Switchboard vNext Wave 2 Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Redactor } from '../src/lib/redaction.js';
import { SwitchboardSecrets } from '../src/lib/switchboard-secrets.js';
import { SwitchboardRegistry } from '../src/lib/switchboard-registry.js';
import { GuardrailManager } from '../src/lib/switchboard-guardrails.js';
import { runCapsule } from '../src/lib/switchboard-runner.js';
import { exportEvidenceBundle, verifyEvidenceBundle } from '../src/lib/switchboard-evidence.js';

describe('Switchboard vNext Wave 2', () => {
  describe('Redaction', () => {
    it('redacts registered secrets from strings', () => {
      const redactor = new Redactor();
      redactor.register('my-secret-token');
      const input = 'Sending my-secret-token to the server';
      expect(redactor.redact(input)).toBe('Sending [REDACTED] to the server');
    });

    it('redacts registered secrets from objects', () => {
      const redactor = new Redactor();
      redactor.register('secret123');
      const input = { data: 'some secret123 value', nested: { val: 'secret123' } };
      const output = redactor.redactObject(input);
      expect(output.data).toBe('some [REDACTED] value');
      expect(output.nested.val).toBe('[REDACTED]');
    });
  });

  describe('Secrets Vault', () => {
    it('sets and retrieves secrets with scoping', () => {
      const vault = new SwitchboardSecrets();
      vault.setSecret('tenant1:toolA:my-key', 'specific-val');
      vault.setSecret('my-key', 'default-val');

      expect(vault.getScopedSecret({ tenantId: 'tenant1', toolId: 'toolA' }, 'my-key')).toBe('specific-val');
      expect(vault.getScopedSecret({ tenantId: 'tenant2' }, 'my-key')).toBe('default-val');
    });
  });

  describe('Registry', () => {
    it('validates tool entries', () => {
      const registry = new SwitchboardRegistry();
      const validEntry = {
        id: 'git',
        name: 'Git Tool',
        type: 'tool',
        capabilities: ['commit', 'push'],
      };
      expect(registry.validateEntry(validEntry).valid).toBe(true);

      const invalidEntry = { id: 'bad', type: 'unknown' };
      expect(registry.validateEntry(invalidEntry).valid).toBe(false);
    });
  });

  describe('Guardrails', () => {
    it('enforces rate limits', () => {
      const guardrails = new GuardrailManager({
        rateLimit: { tokensPerSecond: 10, burst: 2 }
      });
      expect(guardrails.check().allow).toBe(true);
      expect(guardrails.check().allow).toBe(true);
      expect(guardrails.check().allow).toBe(false); // Burst exceeded
    });
  });

  describe('Evidence Bundles', () => {
    it('exports and verifies a bundle', async () => {
      const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-bundle-test-'));
      const manifestPath = path.join(repoRoot, 'capsule.yaml');
      fs.writeFileSync(manifestPath, `
version: v2
name: test-bundle
allowed_commands:
  - node
steps:
  - id: step1
    command: node
    args: ["-e", "console.log('hello')"]
`, 'utf8');

      const runResult = await runCapsule({ manifestPath, repoRoot });
      const exportPath = path.join(repoRoot, 'exported-bundle');

      exportEvidenceBundle(repoRoot, runResult.sessionId, exportPath);
      expect(fs.existsSync(path.join(exportPath, 'metadata.json'))).toBe(true);
      expect(fs.existsSync(path.join(exportPath, 'receipts.jsonl'))).toBe(true);

      const verif = verifyEvidenceBundle(exportPath);
      if (!verif.valid) console.log('Verif errors:', verif.errors);
      expect(verif.valid).toBe(true);

      fs.rmSync(repoRoot, { recursive: true, force: true });
    });
  });
});
