import {
  createHash,
  createHmac,
  createPublicKey,
  createSecretKey,
  generateKeyPairSync,
  randomBytes,
  sign as signPayload,
  verify as verifyPayload,
} from 'node:crypto';
import type { EvidenceBundle, LedgerEntry, LedgerFactInput } from 'common-types';

const LAMPORT_KEY_COUNT = 256;
const LAMPORT_SECRET_BYTES = 32;
const RFC3526_GROUP14_PRIME =
  '0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1' +
  '29024E088A67CC74020BBEA63B139B22514A08798E3404DD' +
  'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245' +
  'E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
  'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381' +
  'FFFFFFFFFFFFFFFF';
const RFC3526_GROUP14_GENERATOR = 2n;

function sha256(buffer: Buffer | string): Buffer {
  return createHash('sha256').update(buffer).digest();
}

function sha256Hex(buffer: Buffer | string): string {
  return sha256(buffer).toString('hex');
}

function bigIntFromHex(hex: string): bigint {
  return BigInt(hex.startsWith('0x') ? hex : `0x${hex}`);
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
  let result = 1n;
  let b = base % modulus;
  let e = exponent;
  while (e > 0n) {
    if (e % 2n === 1n) {
      result = (result * b) % modulus;
    }
    e /= 2n;
    b = (b * b) % modulus;
  }
  return result;
}

function randomScalar(modulus: bigint): bigint {
  const byteLength = Math.ceil(modulus.toString(16).length / 2);
  let scalar = 0n;
  while (scalar === 0n) {
    const bytes = randomBytes(byteLength);
    scalar = BigInt(`0x${bytes.toString('hex')}`) % (modulus - 1n);
  }
  return scalar;
}

export function computeLedgerHash(
  fact: LedgerFactInput,
  timestamp: string,
  previousHash?: string,
): string {
  return sha256Hex(
    `${fact.id}|${fact.category}|${fact.actor}|${fact.action}|${fact.resource}|${JSON.stringify(fact.payload)}|${timestamp}|${previousHash ?? ''}`,
  );
}

export type LamportPublicKey = readonly [string, string][];
export type LamportPrivateKey = readonly [string, string][];

export interface LamportKeyPair {
  publicKey: LamportPublicKey;
  privateKey: LamportPrivateKey;
}

export interface LamportSignature {
  algorithm: 'lamport-ots-sha256';
  signature: readonly string[];
}

export function generateLamportKeyPair(): LamportKeyPair {
  const privateKey: [string, string][] = [];
  const publicKey: [string, string][] = [];

  for (let i = 0; i < LAMPORT_KEY_COUNT; i += 1) {
    const left = randomBytes(LAMPORT_SECRET_BYTES);
    const right = randomBytes(LAMPORT_SECRET_BYTES);
    privateKey.push([left.toString('base64'), right.toString('base64')]);
    publicKey.push([sha256(left).toString('base64'), sha256(right).toString('base64')]);
  }

  return { publicKey, privateKey };
}

export function signWithLamport(
  message: Buffer | string,
  keyPair: LamportKeyPair,
): LamportSignature {
  const digest = sha256(typeof message === 'string' ? Buffer.from(message) : message);
  const signature: string[] = [];

  digest.forEach((byte, digestIndex) => {
    for (let bit = 0; bit < 8; bit += 1) {
      const isOne = (byte >> bit) & 1;
      const keyIndex = digestIndex * 8 + bit;
      const part = keyPair.privateKey[keyIndex]?.[isOne];
      if (!part) {
        throw new Error(`Missing Lamport private key segment at index ${keyIndex}`);
      }
      signature.push(part);
    }
  });

  return { algorithm: 'lamport-ots-sha256', signature };
}

export function verifyLamportSignature(
  message: Buffer | string,
  signature: LamportSignature,
  publicKey: LamportPublicKey,
): boolean {
  if (signature.signature.length !== LAMPORT_KEY_COUNT) {
    return false;
  }

  const digest = sha256(typeof message === 'string' ? Buffer.from(message) : message);

  let cursor = 0;
  for (let digestIndex = 0; digestIndex < digest.length; digestIndex += 1) {
    const byte = digest[digestIndex];
    for (let bit = 0; bit < 8; bit += 1) {
      const isOne = (byte >> bit) & 1;
      const pubIndex = digestIndex * 8 + bit;
      const expected = publicKey[pubIndex]?.[isOne];
      const revealed = signature.signature[cursor];
      if (!expected || !revealed) {
        return false;
      }
      if (sha256(Buffer.from(revealed, 'base64')).toString('base64') !== expected) {
        return false;
      }
      cursor += 1;
    }
  }

  return true;
}

export interface HybridKeyPair {
  lamport: LamportKeyPair;
  ed25519PublicKey: string;
  ed25519PrivateKey: string;
}

export interface HybridSignature {
  algorithm: 'hybrid-ed25519-lamport';
  lamport: LamportSignature;
  lamportPublicKey: LamportPublicKey;
  ed25519Signature: string;
  ed25519PublicKey: string;
}

export function generateHybridKeyPair(): HybridKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const lamport = generateLamportKeyPair();

  return {
    lamport,
    ed25519PublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    ed25519PrivateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

export function signHybrid(message: Buffer | string, keyPair: HybridKeyPair): HybridSignature {
  const payload = typeof message === 'string' ? Buffer.from(message) : message;
  const lamport = signWithLamport(payload, keyPair.lamport);
  const ed25519Signature = signPayload(null, payload, keyPair.ed25519PrivateKey).toString('base64');

  return {
    algorithm: 'hybrid-ed25519-lamport',
    lamport,
    lamportPublicKey: keyPair.lamport.publicKey,
    ed25519Signature,
    ed25519PublicKey: keyPair.ed25519PublicKey,
  };
}

export function verifyHybridSignature(
  message: Buffer | string,
  signature: HybridSignature,
): boolean {
  if (signature.algorithm !== 'hybrid-ed25519-lamport') {
    return false;
  }

  const payload = typeof message === 'string' ? Buffer.from(message) : message;
  const lamportOk = verifyLamportSignature(payload, signature.lamport, signature.lamportPublicKey);
  if (!lamportOk) {
    return false;
  }

  const publicKey = createPublicKey(signature.ed25519PublicKey);
  const ed25519Ok = verifyPayload(null, payload, publicKey, Buffer.from(signature.ed25519Signature, 'base64'));
  return ed25519Ok;
}

export interface SchnorrKeyPair {
  secret: bigint;
  publicKey: bigint;
}

export interface SchnorrProof {
  commitment: string;
  challenge: string;
  response: string;
}

const SCHNORR_MODULUS = bigIntFromHex(RFC3526_GROUP14_PRIME);
const SCHNORR_GENERATOR = RFC3526_GROUP14_GENERATOR;
const SCHNORR_ORDER = SCHNORR_MODULUS - 1n;

export function generateSchnorrKeyPair(): SchnorrKeyPair {
  const secret = randomScalar(SCHNORR_MODULUS);
  const publicKey = modPow(SCHNORR_GENERATOR, secret, SCHNORR_MODULUS);
  return { secret, publicKey };
}

function deriveSchnorrChallenge(commitment: bigint, message: string): bigint {
  const digest = sha256(`${commitment.toString(16)}:${message}`).toString('hex');
  return BigInt(`0x${digest}`) % SCHNORR_ORDER;
}

export function createSchnorrProof(
  keyPair: SchnorrKeyPair,
  message: string,
  randomNonce?: bigint,
): SchnorrProof {
  const nonce = randomNonce ?? randomScalar(SCHNORR_MODULUS);
  const commitment = modPow(SCHNORR_GENERATOR, nonce, SCHNORR_MODULUS);
  const challenge = deriveSchnorrChallenge(commitment, message);
  const response = (nonce + challenge * keyPair.secret) % SCHNORR_ORDER;

  return {
    commitment: commitment.toString(16),
    challenge: challenge.toString(16),
    response: response.toString(16),
  };
}

export function verifySchnorrProof(
  publicKey: bigint,
  message: string,
  proof: SchnorrProof,
): boolean {
  const commitment = bigIntFromHex(proof.commitment);
  const challenge = bigIntFromHex(proof.challenge);
  const response = bigIntFromHex(proof.response);

  const derivedChallenge = deriveSchnorrChallenge(commitment, message);
  if (derivedChallenge !== challenge) {
    return false;
  }

  const lhs = modPow(SCHNORR_GENERATOR, response, SCHNORR_MODULUS);
  const rhs = (commitment * modPow(publicKey, challenge, SCHNORR_MODULUS)) % SCHNORR_MODULUS;
  return lhs === rhs;
}

export interface AccessTokenPayload {
  actor: string;
  scope: string;
  issuedAt: string;
  expiresAt: string;
}

export interface AccessToken {
  token: string;
  payload: AccessTokenPayload;
}

export class AccessTokenService {
  private readonly secret: Buffer;
  private readonly ttlMs: number;
  private readonly now: () => Date;

  constructor(secret: string, options: { ttlMs?: number; now?: () => Date } = {}) {
    this.secret = createSecretKey(Buffer.from(secret));
    this.ttlMs = options.ttlMs ?? 10 * 60 * 1000;
    this.now = options.now ?? (() => new Date());
  }

  issue(actor: string, scope: string): AccessToken {
    const issuedAt = this.now().toISOString();
    const expiresAt = new Date(this.now().getTime() + this.ttlMs).toISOString();
    const payload: AccessTokenPayload = { actor, scope, issuedAt, expiresAt };
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(payloadBase64).digest('base64url');
    return { token: `${payloadBase64}.${signature}`, payload };
  }

  verify(
    token: string,
    expectedActor?: string,
    expectedScope?: string,
    options: { allowExpired?: boolean } = {},
  ): AccessTokenPayload | null {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) {
      return null;
    }

    const expectedSignature = createHmac('sha256', this.secret)
      .update(payloadBase64)
      .digest('base64url');
    if (expectedSignature !== signature) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString()) as AccessTokenPayload;
    const now = this.now();
    if (!options.allowExpired && new Date(payload.expiresAt).getTime() < now.getTime()) {
      return null;
    }
    if (expectedActor && payload.actor !== expectedActor) {
      return null;
    }
    if (expectedScope && payload.scope !== expectedScope) {
      return null;
    }

    return payload;
  }
}

export interface QuantumLedgerEntry extends LedgerEntry {
  chainHash: string;
  signature: HybridSignature;
  zkProof?: SchnorrProof;
  access: AccessTokenPayload;
  accessToken: string;
}

export interface QuantumLedgerOptions {
  now?: () => Date;
  identityPublicKey?: bigint;
}

export class QuantumSafeLedger {
  private readonly entries: QuantumLedgerEntry[] = [];
  private readonly now: () => Date;
  private readonly identityPublicKey?: bigint;

  constructor(private readonly tokenService: AccessTokenService, options: QuantumLedgerOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.identityPublicKey = options.identityPublicKey;
  }

  append(
    fact: LedgerFactInput,
    signature: HybridSignature,
    accessToken: string,
    zkProof?: SchnorrProof,
  ): QuantumLedgerEntry {
    const timestamp = fact.timestamp ?? this.now().toISOString();
    const previous = this.entries.at(-1);
    const entry: LedgerEntry = {
      ...fact,
      timestamp,
      previousHash: previous?.hash,
      hash: '',
    };
    entry.hash = computeLedgerHash(entry, timestamp, entry.previousHash);

    const access = this.tokenService.verify(accessToken, entry.actor, fact.category);
    if (!access) {
      throw new Error('Access token is invalid or expired for actor/category');
    }

    if (!verifyHybridSignature(entry.hash, signature)) {
      throw new Error('Signature verification failed');
    }

    if (this.identityPublicKey) {
      if (!zkProof) {
        throw new Error('Zero-knowledge proof is required when an identity key is configured');
      }
      const proofOk = verifySchnorrProof(this.identityPublicKey, entry.hash, zkProof);
      if (!proofOk) {
        throw new Error('Zero-knowledge proof verification failed');
      }
    }

    const chainSource = `${previous?.chainHash ?? ''}|${entry.hash}|${signature.ed25519Signature}`;
    const chainHash = sha256Hex(chainSource);

    const recorded: QuantumLedgerEntry = {
      ...entry,
      chainHash,
      signature,
      zkProof,
      access,
      accessToken,
    };

    this.entries.push(recorded);
    return recorded;
  }

  list(limit = 100): QuantumLedgerEntry[] {
    if (limit >= this.entries.length) {
      return [...this.entries];
    }
    return this.entries.slice(this.entries.length - limit);
  }

  verifyChain(): boolean {
    return this.entries.every((entry, index) => {
      const payloadHash = computeLedgerHash(entry, entry.timestamp, entry.previousHash);
      if (payloadHash !== entry.hash) {
        return false;
      }

      if (!verifyHybridSignature(entry.hash, entry.signature)) {
        return false;
      }

      const prior = index === 0 ? undefined : this.entries[index - 1];
      const expectedChain = sha256Hex(`${prior?.chainHash ?? ''}|${entry.hash}|${entry.signature.ed25519Signature}`);
      if (entry.chainHash !== expectedChain) {
        return false;
      }

      const tokenPayload = this.tokenService.verify(entry.accessToken, entry.actor, entry.category, {
        allowExpired: true,
      });
      if (!tokenPayload) {
        return false;
      }

      if (this.identityPublicKey) {
        if (!entry.zkProof) {
          return false;
        }
        if (!verifySchnorrProof(this.identityPublicKey, entry.hash, entry.zkProof)) {
          return false;
        }
      }

      return true;
    });
  }

  exportEvidence(limit = 200): EvidenceBundle {
    const entries = this.list(limit);
    return {
      generatedAt: this.now().toISOString(),
      headHash: entries.at(-1)?.chainHash,
      entries,
    };
  }
}
