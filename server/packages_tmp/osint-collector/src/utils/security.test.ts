import { describe, it, expect } from '@jest/globals';
import { validateSafeUrl } from './security.js';

describe('validateSafeUrl', () => {
  it('should allow valid public URLs', async () => {
    await expect(validateSafeUrl('https://www.google.com')).resolves.not.toThrow();
    await expect(validateSafeUrl('http://example.com/foo/bar')).resolves.not.toThrow();
    await expect(validateSafeUrl('https://8.8.8.8/dns-query')).resolves.not.toThrow();
  });

  it('should block invalid protocols', async () => {
    await expect(validateSafeUrl('ftp://example.com')).rejects.toThrow('Unsafe protocol');
    await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow('Unsafe protocol');
    await expect(validateSafeUrl('gopher://example.com')).rejects.toThrow('Unsafe protocol');
  });

  it('should block private IPv4 addresses', async () => {
    await expect(validateSafeUrl('http://127.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://10.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://192.168.1.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://169.254.169.254')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://172.16.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://172.31.255.255')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://0.0.0.0')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block private IPv6 addresses', async () => {
    await expect(validateSafeUrl('http://[::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[fc00::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[fe80::1]')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block DNS rebinding to private IP (simulated via mocking or known localhost)', async () => {
    // localhost typically resolves to 127.0.0.1 or ::1
    await expect(validateSafeUrl('http://localhost')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should allow public non-private IPs (edge cases)', async () => {
    // 1.1.1.1 is Cloudflare DNS
    await expect(validateSafeUrl('http://1.1.1.1')).resolves.not.toThrow();
    // 172.32.0.1 is public
    await expect(validateSafeUrl('http://172.32.0.1')).resolves.not.toThrow();
  });
});
