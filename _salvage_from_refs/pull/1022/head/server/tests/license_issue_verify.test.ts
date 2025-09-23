import crypto from 'crypto';
import { issueLicense, verifyLicense } from '../src/products/ProductLicense';

describe('ProductLicense', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const base = { productId: 'p', tenantId: 't', roomId: 'r', epsilonCap: 1, expiresAt: Date.now() + 1000, scopes: ['count'] };

  it('issues and verifies license', () => {
    const { token } = issueLicense(base, privateKey);
    const payload = verifyLicense(token, publicKey);
    expect(payload.productId).toBe('p');
  });

  it('rejects expired license', () => {
    const { token } = issueLicense({ ...base, expiresAt: Date.now() - 1000 }, privateKey);
    expect(() => verifyLicense(token, publicKey)).toThrow('license_expired');
  });
});
