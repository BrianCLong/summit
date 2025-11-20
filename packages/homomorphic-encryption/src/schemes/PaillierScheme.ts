/**
 * Paillier Partially Homomorphic Encryption
 * Supports additive homomorphic operations
 */

import crypto from 'crypto';
import { HEKeyPair, HECiphertext, HEPublicKey, HEPrivateKey } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

export class PaillierScheme {
  /**
   * Generate Paillier key pair
   */
  generateKeyPair(bitLength: number = 2048): HEKeyPair {
    // Generate two large primes p and q
    // In production, use a proper cryptographic library
    const p = this.generatePrime(bitLength / 2);
    const q = this.generatePrime(bitLength / 2);

    const n = p * q;
    const nSquared = n * n;
    const lambda = this.lcm(p - 1n, q - 1n);
    const g = n + 1n;

    // Calculate μ = (L(g^λ mod n²))^(-1) mod n
    const mu = this.modInverse(this.L(this.modPow(g, lambda, nSquared), n), n);

    const keyId = uuidv4();

    const publicKey: HEPublicKey = {
      keyId,
      scheme: 'paillier',
      parameters: {
        n: n.toString(),
        g: g.toString(),
        nSquared: nSquared.toString(),
      },
      keyData: JSON.stringify({ n: n.toString(), g: g.toString() }),
    };

    const privateKey: HEPrivateKey = {
      keyId,
      scheme: 'paillier',
      keyData: JSON.stringify({
        lambda: lambda.toString(),
        mu: mu.toString(),
        n: n.toString(),
      }),
    };

    return {
      publicKey,
      privateKey,
    };
  }

  /**
   * Encrypt a number
   */
  encrypt(plaintext: number, publicKey: HEPublicKey): HECiphertext {
    const { n, g, nSquared } = publicKey.parameters;
    const nBig = BigInt(n);
    const gBig = BigInt(g);
    const nSquaredBig = BigInt(nSquared);

    const m = BigInt(plaintext);

    // Generate random r where 0 < r < n
    const r = this.generateRandomBigInt(nBig);

    // c = g^m * r^n mod n^2
    const gm = this.modPow(gBig, m, nSquaredBig);
    const rn = this.modPow(r, nBig, nSquaredBig);
    const c = (gm * rn) % nSquaredBig;

    return {
      scheme: 'paillier',
      ciphertextData: c.toString(),
      parameters: {
        n: n.toString(),
      },
    };
  }

  /**
   * Decrypt a ciphertext
   */
  decrypt(ciphertext: HECiphertext, privateKey: HEPrivateKey): number {
    const privKeyData = JSON.parse(privateKey.keyData);
    const lambda = BigInt(privKeyData.lambda);
    const mu = BigInt(privKeyData.mu);
    const n = BigInt(privKeyData.n);
    const nSquared = n * n;

    const c = BigInt(ciphertext.ciphertextData);

    // m = L(c^λ mod n²) * μ mod n
    const cLambda = this.modPow(c, lambda, nSquared);
    const L_value = this.L(cLambda, n);
    const m = (L_value * mu) % n;

    return Number(m);
  }

  /**
   * Homomorphic addition: E(m1) + E(m2) = E(m1 + m2)
   */
  add(ciphertext1: HECiphertext, ciphertext2: HECiphertext): HECiphertext {
    const n = BigInt(ciphertext1.parameters!.n);
    const nSquared = n * n;

    const c1 = BigInt(ciphertext1.ciphertextData);
    const c2 = BigInt(ciphertext2.ciphertextData);

    // c = c1 * c2 mod n^2
    const result = (c1 * c2) % nSquared;

    return {
      scheme: 'paillier',
      ciphertextData: result.toString(),
      parameters: ciphertext1.parameters,
    };
  }

  /**
   * Homomorphic scalar multiplication: E(m) * k = E(m * k)
   */
  multiplyPlaintext(ciphertext: HECiphertext, scalar: number): HECiphertext {
    const n = BigInt(ciphertext.parameters!.n);
    const nSquared = n * n;

    const c = BigInt(ciphertext.ciphertextData);
    const k = BigInt(scalar);

    // result = c^k mod n^2
    const result = this.modPow(c, k, nSquared);

    return {
      scheme: 'paillier',
      ciphertextData: result.toString(),
      parameters: ciphertext.parameters,
    };
  }

  /**
   * L function: L(x) = (x - 1) / n
   */
  private L(x: bigint, n: bigint): bigint {
    return (x - 1n) / n;
  }

  /**
   * Generate a random bigint less than max
   */
  private generateRandomBigInt(max: bigint): bigint {
    const bytes = Math.ceil(max.toString(16).length / 2);
    let random: bigint;

    do {
      random = BigInt('0x' + crypto.randomBytes(bytes).toString('hex'));
    } while (random >= max);

    return random;
  }

  /**
   * Generate a probable prime (simplified - use crypto library in production)
   */
  private generatePrime(bits: number): bigint {
    const bytes = Math.ceil(bits / 8);
    let candidate: bigint;

    do {
      candidate = BigInt('0x' + crypto.randomBytes(bytes).toString('hex'));
      candidate |= (1n << BigInt(bits - 1)) | 1n; // Ensure high bit and odd
    } while (!this.isProbablePrime(candidate));

    return candidate;
  }

  /**
   * Miller-Rabin primality test (simplified)
   */
  private isProbablePrime(n: bigint, k: number = 5): boolean {
    if (n === 2n || n === 3n) return true;
    if (n < 2n || n % 2n === 0n) return false;

    // Write n-1 as 2^r * d
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
      r++;
      d /= 2n;
    }

    // Witness loop
    WitnessLoop: for (let i = 0; i < k; i++) {
      const a = this.generateRandomBigInt(n - 3n) + 2n;
      let x = this.modPow(a, d, n);

      if (x === 1n || x === n - 1n) continue;

      for (let j = 0n; j < r - 1n; j++) {
        x = this.modPow(x, 2n, n);
        if (x === n - 1n) continue WitnessLoop;
      }

      return false;
    }

    return true;
  }

  /**
   * Modular exponentiation
   */
  private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
    let result = 1n;
    base = base % modulus;

    while (exponent > 0n) {
      if (exponent % 2n === 1n) {
        result = (result * base) % modulus;
      }
      exponent = exponent / 2n;
      base = (base * base) % modulus;
    }

    return result;
  }

  /**
   * Modular inverse using Extended Euclidean Algorithm
   */
  private modInverse(a: bigint, m: bigint): bigint {
    const [g, x] = this.extendedGCD(a, m);

    if (g !== 1n) {
      throw new Error('Modular inverse does not exist');
    }

    return ((x % m) + m) % m;
  }

  /**
   * Extended Euclidean Algorithm
   */
  private extendedGCD(a: bigint, b: bigint): [bigint, bigint, bigint] {
    if (b === 0n) {
      return [a, 1n, 0n];
    }

    const [gcd, x1, y1] = this.extendedGCD(b, a % b);
    const x = y1;
    const y = x1 - (a / b) * y1;

    return [gcd, x, y];
  }

  /**
   * Least Common Multiple
   */
  private lcm(a: bigint, b: bigint): bigint {
    return (a * b) / this.gcd(a, b);
  }

  /**
   * Greatest Common Divisor
   */
  private gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }
}
