
import * as crypto from 'crypto';
import { logger } from '../config/logger.js';

/**
 * Quantum-Safe Cryptography Utilities (Experimental - Task #103).
 * Provides wrappers for PQC algorithms and hybrid schemes.
 */
export class QuantumSafeCrypto {
  private static instance: QuantumSafeCrypto;

  private constructor() {}

  public static getInstance(): QuantumSafeCrypto {
    if (!QuantumSafeCrypto.instance) {
      QuantumSafeCrypto.instance = new QuantumSafeCrypto();
    }
    return QuantumSafeCrypto.instance;
  }

  /**
   * Generates a hybrid key (Experimental).
   * Combines a classical key (e.g. ECC) with a simulated quantum-safe component.
   */
  public async generateHybridKey(): Promise<{ classical: string; quantumSafe: string }> {
    logger.info('PQC: Generating experimental hybrid key');
    
    // Classical ECC component
    const { publicKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'secp256k1',
    });

    // Simulated Quantum-Safe component (e.g. representing a Kyber key)
    const qsComponent = crypto.randomBytes(32).toString('hex');

    return {
      classical: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      quantumSafe: qsComponent
    };
  }

  /**
   * Constant-time comparison to defend against timing side-channel attacks.
   */
  public constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}

export const pqcCrypto = QuantumSafeCrypto.getInstance();
