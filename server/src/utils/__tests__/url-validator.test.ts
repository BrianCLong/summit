import { describe, it, expect } from '@jest/globals';
import { validateWebhookUrl } from '../url-validator.js';

describe('validateWebhookUrl', () => {
  it('should allow valid public URLs', async () => {
    expect(await validateWebhookUrl('http://google.com')).toBe(true);
    expect(await validateWebhookUrl('https://example.com')).toBe(true);
  });

  it('should block localhost', async () => {
    await expect(validateWebhookUrl('http://localhost:3000')).rejects.toThrow('Internal addresses are not allowed');
  });

  it('should block 127.0.0.1', async () => {
    await expect(validateWebhookUrl('http://127.0.0.1:8080')).rejects.toThrow('Internal addresses are not allowed');
  });

  it('should block AWS metadata service', async () => {
    await expect(validateWebhookUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/private IP address/);
  });

  it('should block private IP ranges (10.x.x.x)', async () => {
    await expect(validateWebhookUrl('http://10.0.0.1/admin')).rejects.toThrow(/private IP address/);
  });

  it('should block private IP ranges (192.168.x.x)', async () => {
    await expect(validateWebhookUrl('http://192.168.1.1/router')).rejects.toThrow(/private IP address/);
  });

  it('should block non-HTTP/HTTPS protocols', async () => {
    await expect(validateWebhookUrl('ftp://example.com')).rejects.toThrow('Only HTTP and HTTPS protocols are allowed');
  });

  it('should block loopback IPv6', async () => {
      await expect(validateWebhookUrl('http://[::1]:8080')).rejects.toThrow('Internal addresses are not allowed');
  });
});
