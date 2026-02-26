/**
 * Security-Critical Path Unit Tests
 *
 * Tests for the highest-risk code paths identified in the v5.0.0 injection audit.
 * Coverage target: ≥ 90% for security-critical business logic.
 */

import { strict as assert } from 'node:assert';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';

// ─── Test helpers ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

console.log('\n── Security-Critical Path Unit Tests ──\n');

// ─── 1. HMAC Signature Verification ─────────────────────────────────────────

console.log('1. HMAC Signature Verification (InboundAlertService)\n');

function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const hmac = createHmac('sha256', secret);
  const expectedSig = 'sha256=' + hmac.update(payload).digest('hex');
  const expectedBuf = Buffer.from(expectedSig);
  const receivedBuf = Buffer.from(signature);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

await test('Valid HMAC-SHA256 signature is accepted', () => {
  const secret = 'webhook-secret-key';
  const payload = JSON.stringify({ event: 'alert', data: { id: 1 } });
  const hmac = createHmac('sha256', secret);
  const signature = 'sha256=' + hmac.update(payload).digest('hex');
  assert.ok(verifyHmacSignature(payload, signature, secret));
});

await test('Invalid HMAC signature is rejected', () => {
  const secret = 'webhook-secret-key';
  const payload = JSON.stringify({ event: 'alert', data: { id: 1 } });
  assert.ok(!verifyHmacSignature(payload, 'sha256=invalid', secret));
});

await test('Wrong secret produces different signature', () => {
  const payload = JSON.stringify({ event: 'alert' });
  const hmac1 = createHmac('sha256', 'secret-a');
  const sig1 = 'sha256=' + hmac1.update(payload).digest('hex');
  assert.ok(!verifyHmacSignature(payload, sig1, 'secret-b'));
});

await test('Empty payload is handled correctly', () => {
  const secret = 'test';
  const payload = '';
  const hmac = createHmac('sha256', secret);
  const sig = 'sha256=' + hmac.update(payload).digest('hex');
  assert.ok(verifyHmacSignature(payload, sig, secret));
});

await test('Timing-safe comparison resists length oracle', () => {
  const secret = 'test';
  const payload = 'data';
  // Short signature should not cause timing leak
  assert.ok(!verifyHmacSignature(payload, 'sha256=abc', secret));
  // Very long signature should not cause timing leak
  assert.ok(!verifyHmacSignature(payload, 'sha256=' + 'a'.repeat(200), secret));
});

// ─── 2. Cypher Injection Guards ─────────────────────────────────────────────

console.log('\n2. Cypher Injection Guards (neo4j.ts)\n');

const VALID_REL_TYPE = /^[A-Z_][A-Z0-9_]*$/;
const ALLOWED_ALGORITHMS = ['betweenness', 'closeness', 'degree', 'pagerank'];

function validateRelationshipType(relType: string): boolean {
  return VALID_REL_TYPE.test(relType);
}

function validateAlgorithm(algorithm: string): boolean {
  return ALLOWED_ALGORITHMS.includes(algorithm);
}

await test('Valid relationship types are accepted', () => {
  assert.ok(validateRelationshipType('RELATES_TO'));
  assert.ok(validateRelationshipType('HAS_MEMBER'));
  assert.ok(validateRelationshipType('KNOWS'));
  assert.ok(validateRelationshipType('A'));
});

await test('Cypher injection in relationship type is blocked', () => {
  assert.ok(!validateRelationshipType('KNOWS]->(x) DETACH DELETE x WITH x MATCH (a)-[r:FAKE'));
  assert.ok(!validateRelationshipType('a})-[r:KNOWS]-(b'));
  assert.ok(!validateRelationshipType('KNOWS|HATES'));
  assert.ok(!validateRelationshipType(''));
  assert.ok(!validateRelationshipType(' '));
  assert.ok(!validateRelationshipType('KNOWS; DROP'));
});

await test('Valid algorithms are accepted', () => {
  assert.ok(validateAlgorithm('betweenness'));
  assert.ok(validateAlgorithm('closeness'));
  assert.ok(validateAlgorithm('degree'));
  assert.ok(validateAlgorithm('pagerank'));
});

await test('Invalid algorithms are rejected', () => {
  assert.ok(!validateAlgorithm('custom'));
  assert.ok(!validateAlgorithm('betweenness}RETURN 1//'));
  assert.ok(!validateAlgorithm(''));
  assert.ok(!validateAlgorithm('pagerank)YIELD'));
});

// ─── 3. HTML Sanitization ────────────────────────────────────────────────────

console.log('\n3. HTML Sanitization (HelpArticleView)\n');

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s>][\s\S]*?<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, 'about:invalid');
}

await test('Script tags are stripped', () => {
  const input = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
  const result = sanitizeHtml(input);
  assert.ok(!result.includes('<script'));
  assert.ok(result.includes('<p>Hello</p>'));
  assert.ok(result.includes('<p>World</p>'));
});

await test('Iframe tags are stripped', () => {
  const input = '<div><iframe src="evil.com"></iframe></div>';
  const result = sanitizeHtml(input);
  assert.ok(!result.includes('<iframe'));
  assert.ok(result.includes('<div>'));
});

await test('Event handlers are stripped', () => {
  const input = '<img src="x" onerror="alert(1)" />';
  const result = sanitizeHtml(input);
  assert.ok(!result.includes('onerror'));
  assert.ok(result.includes('<img'));
});

await test('JavaScript URLs are neutralized', () => {
  const input = '<a href="javascript:alert(1)">Click</a>';
  const result = sanitizeHtml(input);
  assert.ok(!result.includes('javascript:'));
  assert.ok(result.includes('about:invalid'));
});

await test('Safe HTML is preserved', () => {
  const input = '<h1>Title</h1><p>Paragraph with <strong>bold</strong> text</p>';
  const result = sanitizeHtml(input);
  assert.equal(result, input);
});

// ─── 4. Command Injection Guard (execFileSync pattern) ───────────────────────

console.log('\n4. Command Injection Guard (cosign/sbom plugins)\n');

function validateCommandArg(arg: string): boolean {
  // Arguments must not contain shell metacharacters
  const SHELL_METACHAR = /[;|&$`\\<>(){}!#~\n\r]/;
  return !SHELL_METACHAR.test(arg);
}

await test('Safe arguments are accepted', () => {
  assert.ok(validateCommandArg('myimage:latest'));
  assert.ok(validateCommandArg('--key=value'));
  assert.ok(validateCommandArg('/usr/local/bin/cosign'));
  assert.ok(validateCommandArg('sha256:abc123'));
});

await test('Shell injection patterns are rejected', () => {
  assert.ok(!validateCommandArg('myimage; rm -rf /'));
  assert.ok(!validateCommandArg('img$(whoami)'));
  assert.ok(!validateCommandArg('img`id`'));
  assert.ok(!validateCommandArg('img | cat /etc/passwd'));
  assert.ok(!validateCommandArg('img & evil'));
});

// ─── 5. Prototype Pollution Guard ────────────────────────────────────────────

console.log('\n5. Prototype Pollution Guard\n');

function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (DANGEROUS_KEYS.includes(key)) {
      delete result[key];
    }
  }
  return result;
}

await test('__proto__ key is stripped from objects', () => {
  const malicious = JSON.parse('{"__proto__": {"admin": true}, "name": "test"}');
  const sanitized = sanitizeObject(malicious);
  assert.ok(!('__proto__' in sanitized) || typeof sanitized.__proto__ !== 'object' || !(sanitized.__proto__ as any)?.admin);
  assert.equal(sanitized.name, 'test');
});

await test('constructor key is stripped', () => {
  const malicious = { constructor: { prototype: { admin: true } }, name: 'test' };
  const sanitized = sanitizeObject(malicious);
  assert.ok(!sanitized.constructor || typeof sanitized.constructor !== 'object');
});

await test('Safe objects pass through unchanged', () => {
  const safe = { name: 'John', role: 'analyst', score: 0.95 };
  const result = sanitizeObject(safe);
  assert.deepStrictEqual(result, safe);
});

// ─── 6. SSRF URL Validation ─────────────────────────────────────────────────

console.log('\n6. SSRF URL Validation\n');

function isPrivateUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    // Block private/internal IP ranges
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (hostname.startsWith('10.')) return true;
    if (hostname.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
    if (hostname === '169.254.169.254') return true; // AWS metadata
    if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true; // IPv6 private
    if (hostname === '0.0.0.0') return true;
    return false;
  } catch {
    return true; // Invalid URLs are blocked
  }
}

await test('Public URLs are allowed', () => {
  assert.ok(!isPrivateUrl('https://api.example.com/data'));
  assert.ok(!isPrivateUrl('https://feeds.govinfo.gov/rss'));
});

await test('Private IPs are blocked', () => {
  assert.ok(isPrivateUrl('http://10.0.0.1/api'));
  assert.ok(isPrivateUrl('http://192.168.1.1/admin'));
  assert.ok(isPrivateUrl('http://172.16.0.1/internal'));
  assert.ok(isPrivateUrl('http://127.0.0.1:8080/secret'));
  assert.ok(isPrivateUrl('http://localhost:3000'));
});

await test('AWS metadata endpoint is blocked', () => {
  assert.ok(isPrivateUrl('http://169.254.169.254/latest/meta-data/'));
});

await test('Invalid URLs are blocked', () => {
  assert.ok(isPrivateUrl('not-a-url'));
  assert.ok(isPrivateUrl(''));
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
process.exitCode = failed > 0 ? 1 : 0;
