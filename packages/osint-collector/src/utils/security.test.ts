import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals';
import dns from 'dns';

// Declare variable for the function
let validateSafeUrl: (url: string) => Promise<string>;
let lookupSpy: any;

describe('validateSafeUrl', () => {
  beforeAll(async () => {
     try {
       // Spy on dns.lookup
       // Note: In some environments dns.lookup is a read-only property.
       lookupSpy = jest.spyOn(dns, 'lookup');

       const module = await import('./security.js');
       validateSafeUrl = module.validateSafeUrl;
     } catch (e) {
       console.error('Setup failed:', e);
       throw e;
     }
  });

  afterAll(() => {
     if (lookupSpy) lookupSpy.mockRestore();
  });

  beforeEach(() => {
    if (lookupSpy) lookupSpy.mockReset();
  });

  it('should allow valid public URLs and return resolved IP', async () => {
    lookupSpy.mockImplementation((hostname: any, cb: any) => {
        cb(null, { address: '8.8.8.8', family: 4 });
    });

    const ip = await validateSafeUrl('https://www.google.com');
    expect(ip).toBe('8.8.8.8');
    expect(lookupSpy).toHaveBeenCalledWith('www.google.com', expect.any(Function));
  });

  it('should return input IP if hostname is already an IP', async () => {
    const ip = await validateSafeUrl('https://8.8.8.8/dns-query');
    expect(ip).toBe('8.8.8.8');
    expect(lookupSpy).not.toHaveBeenCalled();
  });

  it('should block invalid protocols', async () => {
    await expect(validateSafeUrl('ftp://example.com')).rejects.toThrow('Unsafe protocol');
    await expect(validateSafeUrl('file:///etc/passwd')).rejects.toThrow('Unsafe protocol');
  });

  it('should block private IPv4 addresses directly', async () => {
    await expect(validateSafeUrl('http://127.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://10.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://192.168.1.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://169.254.169.254')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://172.16.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://0.0.0.0')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://224.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://240.0.0.1')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should block private IPv6 addresses directly', async () => {
    await expect(validateSafeUrl('http://[::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[fec0::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[fc00::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[fe80::1]')).rejects.toThrow('Unsafe IP address blocked');
    await expect(validateSafeUrl('http://[::ffff:192.168.1.1]')).rejects.toThrow('Unsafe IP address blocked'); // v4 mapped
    await expect(validateSafeUrl('http://[2001:db8::1]')).rejects.toThrow('Unsafe IP address blocked'); // Documentation
  });

  it('should block DNS rebinding to private IP', async () => {
    lookupSpy.mockImplementation((hostname: any, cb: any) => {
        cb(null, { address: '127.0.0.1', family: 4 });
    });

    await expect(validateSafeUrl('http://malicious-site.com')).rejects.toThrow('Unsafe IP address blocked');
  });

  it('should allow public non-private IPs (edge cases)', async () => {
    lookupSpy.mockImplementation((hostname: any, cb: any) => {
        cb(null, { address: '93.184.216.34', family: 4 }); // example.com
    });
    await expect(validateSafeUrl('http://example.com')).resolves.toBe('93.184.216.34');
  });
});
