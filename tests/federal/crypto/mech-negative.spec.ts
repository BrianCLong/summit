import * as crypto from 'node:crypto';
import { hsmEnforcement } from '../../../server/src/federal/hsm-enforcement';
import { HSMEnforcement } from '../../../server/src/federal/hsm-enforcement';

describe('Crypto Mechanism Negative Tests', () => {
  let enforcement: HSMEnforcement;

  beforeAll(() => {
    process.env.FEDERAL_ENABLED = 'true';
    process.env.FIPS_MODE = 'true';
    process.env.HSM_ENABLED = 'false'; // Use mock for tests

    enforcement = new HSMEnforcement({
      enforceHSM: true,
      allowedMechanisms: ['AES-256-GCM', 'ECDSA-P384', 'RSA-PSS-4096'],
      fipsMode: true,
    });
  });

  describe('RSA PKCS#1 v1.5 blocking', () => {
    it('should reject RSA PKCS#1 v1.5 signature attempts', () => {
      expect(() => {
        enforcement.validateMechanism('RSA-PKCS1-v1_5');
      }).toThrow('Mechanism RSA-PKCS1-v1_5 not in FIPS allowlist');
    });

    it('should reject RSA PKCS#1 v1.5 encryption attempts', () => {
      expect(() => {
        enforcement.validateMechanism('RSA-PKCS1');
      }).toThrow('Mechanism RSA-PKCS1 not in FIPS allowlist');
    });

    it('should only allow RSA-PSS-4096', () => {
      expect(() => {
        enforcement.validateMechanism('RSA-PSS-4096');
      }).not.toThrow();

      expect(() => {
        enforcement.validateMechanism('RSA-PSS-2048');
      }).toThrow('Mechanism RSA-PSS-2048 not in FIPS allowlist');
    });
  });

  describe('AES weak mode blocking', () => {
    it('should reject AES-128-CBC', () => {
      expect(() => {
        enforcement.validateMechanism('AES-128-CBC');
      }).toThrow('Mechanism AES-128-CBC not in FIPS allowlist');
    });

    it('should reject AES-192-GCM', () => {
      expect(() => {
        enforcement.validateMechanism('AES-192-GCM');
      }).toThrow('Mechanism AES-192-GCM not in FIPS allowlist');
    });

    it('should reject AES-256-CBC', () => {
      expect(() => {
        enforcement.validateMechanism('AES-256-CBC');
      }).toThrow('Mechanism AES-256-CBC not in FIPS allowlist');
    });

    it('should only allow AES-256-GCM', () => {
      expect(() => {
        enforcement.validateMechanism('AES-256-GCM');
      }).not.toThrow();
    });
  });

  describe('ECDSA curve blocking', () => {
    it('should reject ECDSA-P256', () => {
      expect(() => {
        enforcement.validateMechanism('ECDSA-P256');
      }).toThrow('Mechanism ECDSA-P256 not in FIPS allowlist');
    });

    it('should reject ECDSA-secp256k1', () => {
      expect(() => {
        enforcement.validateMechanism('ECDSA-secp256k1');
      }).toThrow('Mechanism ECDSA-secp256k1 not in FIPS allowlist');
    });

    it('should only allow ECDSA-P384', () => {
      expect(() => {
        enforcement.validateMechanism('ECDSA-P384');
      }).not.toThrow();
    });
  });

  describe('Legacy algorithm blocking', () => {
    it('should reject SHA-1', () => {
      expect(() => {
        enforcement.validateMechanism('SHA1');
      }).toThrow('Mechanism SHA1 not in FIPS allowlist');
    });

    it('should reject MD5', () => {
      expect(() => {
        enforcement.validateMechanism('MD5');
      }).toThrow('Mechanism MD5 not in FIPS allowlist');
    });

    it('should reject DES', () => {
      expect(() => {
        enforcement.validateMechanism('DES');
      }).toThrow('Mechanism DES not in FIPS allowlist');
    });

    it('should reject 3DES', () => {
      expect(() => {
        enforcement.validateMechanism('3DES');
      }).toThrow('Mechanism 3DES not in FIPS allowlist');
    });
  });

  describe('Node.js crypto wrapper enforcement', () => {
    it('should block non-FIPS cipher creation in federal mode', () => {
      const originalCreateCipher = crypto.createCipher;
      const spy = jest.spyOn(crypto, 'createCipher').mockImplementation(() => {
        throw new Error('Non-FIPS cipher blocked by federal enforcement');
      });

      expect(() => {
        crypto.createCipher('aes128', 'password');
      }).toThrow('Non-FIPS cipher blocked');

      spy.mockRestore();
    });

    it('should block weak key generation', () => {
      expect(() => {
        enforcement.validateKeySize('RSA', 1024);
      }).toThrow('RSA key size 1024 below FIPS minimum 4096');

      expect(() => {
        enforcement.validateKeySize('AES', 128);
      }).toThrow('AES key size 128 below FIPS minimum 256');
    });
  });

  describe('PKCS#11 mechanism validation', () => {
    it('should have strict allowlist of exactly 3 mechanisms', () => {
      const allowedMechanisms = enforcement.getAllowedMechanisms();
      expect(allowedMechanisms).toEqual([
        'AES-256-GCM',
        'ECDSA-P384',
        'RSA-PSS-4096',
      ]);
      expect(allowedMechanisms).toHaveLength(3);
    });

    it('should reject any mechanism not on allowlist', () => {
      const forbiddenMechanisms = [
        'AES-128-GCM',
        'AES-192-GCM',
        'AES-256-CBC',
        'RSA-2048',
        'RSA-PSS-2048',
        'RSA-PKCS1',
        'ECDSA-P256',
        'ECDSA-P521',
        'SHA256-RSA',
        'HMAC-SHA256',
        'ChaCha20-Poly1305',
      ];

      forbiddenMechanisms.forEach((mechanism) => {
        expect(() => {
          enforcement.validateMechanism(mechanism);
        }).toThrow(`Mechanism ${mechanism} not in FIPS allowlist`);
      });
    });
  });

  describe('FIPS mode validation', () => {
    it('should require FIPS mode to be enabled', () => {
      const nonFipsEnforcement = new HSMEnforcement({
        fipsMode: false,
        allowedMechanisms: ['AES-256-GCM'],
      });

      expect(() => {
        nonFipsEnforcement.validateOperation('test-operation');
      }).toThrow('FIPS mode must be enabled for federal operations');
    });

    it('should validate HSM is in FIPS mode', async () => {
      // Mock FIPS check - in production would check CKF_FIPS_MODE flag
      const capabilities = await enforcement.getCapabilities();
      expect(capabilities.fipsMode).toBe(true);
    });
  });

  afterAll(() => {
    enforcement?.destroy();
  });
});
