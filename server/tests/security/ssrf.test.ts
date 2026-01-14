
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SafeAxios } from '../../src/lib/security/outbound-client.js';

describe('SafeAxios SSRF Protection', () => {
  const safeClient = new SafeAxios({
    timeout: 1000,
    allowPrivate: false,
  });

  it('should allow public URLs', async () => {
    // Mocking axios or just relying on DNS failure for non-existent public domains is flaky.
    // Ideally we mock the DNS lookup or the SafeAxios validateUrl method.
    // For this integration test, we expect it to NOT throw "private IP" error,
    // even if it fails to connect.
    try {
      await safeClient.get('https://example.com');
    } catch (err: any) {
      assert.doesNotMatch(err.message, /private IP/);
      assert.doesNotMatch(err.message, /not allowed/);
    }
  });

  it('should block localhost IP', async () => {
    await assert.rejects(
      safeClient.get('http://127.0.0.1/sensitive'),
      {
        message: /is private/
      }
    );
  });

  it('should block localhost hostname', async () => {
    // This depends on DNS resolution of the environment, but usually localhost -> 127.0.0.1
    // The previous run passed this, so "resolves to private IP" is likely the message
    await assert.rejects(
      safeClient.get('http://localhost/sensitive'),
      (err: any) => /private IP/.test(err.message) || /is private/.test(err.message)
    );
  });

  it('should block AWS metadata IP', async () => {
    await assert.rejects(
      safeClient.get('http://169.254.169.254/latest/meta-data'),
      {
         message: /is private/
      }
    );
  });

  it('should block private range 10.x.x.x', async () => {
    await assert.rejects(
      safeClient.get('http://10.0.0.5/admin'),
      {
         message: /is private/
      }
    );
  });

  it('should block non-http protocols', async () => {
    await assert.rejects(
      safeClient.get('ftp://example.com/file'),
      /Protocol ftp: is not allowed/
    );
  });
});
