import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import dns from 'dns';

// Mock dns.lookup
// In ESM with ts-jest, standard jest.spyOn usually works on the default export if imported as `import dns from 'dns'`
// However, depending on node version and jest config, we might need to handle it carefully.
// Assuming the environment setup allows spyOn(dns, 'lookup').

let validateSafeUrl: (url: string) => Promise<string>;
let lookupSpy: any;

describe('validateSafeUrl', () => {
  beforeAll(async () => {
     // Create spy
     lookupSpy = jest.spyOn(dns, 'lookup');

     // Import module AFTER spy is set up if we were mocking module, but spyOn works on existing object
     // Dynamic import to ensure fresh module if needed, but here statically imported module would also use the `dns` object we spy on.
     const mod = await import('./security.js');
     validateSafeUrl = mod.validateSafeUrl;
  });

  afterAll(() => {
     if (lookupSpy) lookupSpy.mockRestore();
  });

  beforeEach(() => {
    if (lookupSpy) lookupSpy.mockReset();
  });

  it('should allow valid public URLs and return resolved IP', async () => {
    lookupSpy.mockImplementation((hostname: string, options: any, cb: any) => {
        // Handle overloads if necessary, but security.ts calls with (hostname, {family:0}) or (hostname)
        // options is likely the object or callback
        if (typeof options === 'function') { cb = options; }
        cb(null, { address: '93.184.216.34', family: 4 });
    });

    const ip = await validateSafeUrl('https://example.com');
    expect(ip).toBe('93.184.216.34');
    expect(lookupSpy).toHaveBeenCalled();
  });

  it('should return input IP if hostname is already an IP', async () => {
    const ip = await validateSafeUrl('https://8.8.8.8/dns-query');
    expect(ip).toBe('8.8.8.8');
    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it('should block private IPv4 addresses directly', async () => {
    await expect(validateSafeUrl('http://127.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://10.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block private IPv6 addresses directly', async () => {
    await expect(validateSafeUrl('http://[::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[fc00::1]')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block DNS rebinding to private IP', async () => {
    lookupSpy.mockImplementation((hostname: string, options: any, cb: any) => {
        if (typeof options === 'function') { cb = options; }
        cb(null, { address: '127.0.0.1', family: 4 });
    });

    await expect(validateSafeUrl('http://malicious-site.com')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block IPv4-mapped IPv6', async () => {
      await expect(validateSafeUrl('http://[::ffff:192.168.1.1]')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block site-local IPv6', async () => {
      await expect(validateSafeUrl('http://[fec0::1]')).rejects.toThrow('Unsafe IP address blocked');
  });
});
