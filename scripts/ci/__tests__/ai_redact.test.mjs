import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { redactText, isRedactionIdempotent, noRawSecretsInOutput } from '../ai-providers/redact.mjs';

describe('Secret/PII Redaction Module', () => {
  test('redactText identifies and redacts GitHub tokens', () => {
    const input = 'Here is my token: ghp_Abc123def456';
    const result = redactText(input);
    
    assert.ok(result.redacted.includes('[GITHUB_TOKEN_REDACTED]'), 'Should redact GitHub tokens');
    assert.ok(result.findings.some(f => f.kind === 'github_token'), 'Should track GitHub token findings');
  });

  test('redactText identifies and redacts AWS access keys', () => {
    const input = 'My AWS key is AKIAXYZ1234567890123';
    const result = redactText(input);
    
    assert.ok(result.redacted.includes('[AWS_ACCESS_KEY_REDACTED]'), 'Should redact AWS keys');
    assert.ok(result.findings.some(f => f.kind === 'aws_access_key'), 'Should track AWS key findings');
  });

  test('redactText identifies and redacts Slack tokens', () => {
    const input = 'Slack bot token: xoxb-123456789-987654321-AbCdEfG';
    const result = redactText(input);
    
    assert.ok(result.redacted.includes('[SLACK_TOKEN_REDACTED]'), 'Should redact Slack tokens');
    assert.ok(result.findings.some(f => f.kind === 'slack_token'), 'Should track Slack token findings');
  });

  test('redactText identifies private key blocks', () => {
    const input = 'BEGIN PRIVATE KEY\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...END PRIVATE KEY';
    const result = redactText(input);
    
    assert.ok(result.redacted.includes('[PRIVATE_KEY_BLOCK_REDACTED]'), 'Should redact private keys');
    assert.ok(result.findings.some(f => f.kind === 'private_key'), 'Should track private key findings');
  });

  test('redactText identifies JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const input = `Bearer ${jwt}`;
    const result = redactText(input);
    
    assert.ok(result.redacted.includes('[JWT_REDACTED]'), 'Should redact JWT tokens');
    assert.ok(result.findings.some(f => f.kind === 'jwt'), 'Should track JWT findings');
  });

  test('redactText is idempotent', () => {
    const input = 'Token: ghp_Abc123def456, again Token: ghp_Abc123def456';
    const result1 = redactText(input);
    const result2 = redactText(result1.redacted);
    
    assert.strictEqual(result1.redacted, result2.redacted, 'Redaction should be idempotent');
  });

  test('redactText findings are sorted deterministically', () => {
    const input = 'Token: ghp_Abc123def456, Key: AKIAXYZ1234567890123';
    const result = redactText(input);
    
    // Findings should be sorted alphabetically by kind
    assert.ok(result.findings.length >= 2, 'Should have at least 2 findings');
    const sortedKinds = result.findings.map(f => f.kind).sort();
    const actualKinds = result.findings.map(f => f.kind);
    assert.deepStrictEqual(actualKinds, sortedKinds, 'Findings should be sorted by kind');
  });

  test('no raw secrets leak into output', () => {
    const input = 'GitHub token: ghp_ABC123def456';
    const result = redactText(input);
    
    assert.ok(noRawSecretsInOutput(input, result.redacted), 'Original secrets should not appear in output');
  });
});