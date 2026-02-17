import { describe, it, expect } from '@jest/globals';
import { validateSafeURL } from '../../utils/input-sanitization.js';

describe('SSRF Validation', () => {
  it('should block private IPs', async () => {
    const privateUrl = 'http://127.0.0.1:8080/admin';
    await expect(validateSafeURL(privateUrl)).rejects.toThrow('URL resolves to a restricted IP');
  });

  it('should block localhost', async () => {
    const localUrl = 'http://localhost:3000/metrics';
    await expect(validateSafeURL(localUrl)).rejects.toThrow('Localhost access is restricted');
  });

  it('should block AWS metadata IP', async () => {
    const metadataUrl = 'http://169.254.169.254/latest/meta-data/';
    await expect(validateSafeURL(metadataUrl)).rejects.toThrow('URL resolves to a restricted IP');
  });

  it('should block VPC internal IP (10.x.x.x)', async () => {
    const vpcUrl = 'http://10.0.0.5/api/admin';
    await expect(validateSafeURL(vpcUrl)).rejects.toThrow('URL resolves to a restricted IP');
  });

  // Note: We cannot easily test public DNS resolution (like example.com) in this environment if it lacks internet access,
  // but we can try. If it fails due to network, we'll know.
  // Assuming the sandbox has internet access or we can mock dns.
});
