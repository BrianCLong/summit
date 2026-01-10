const mockKeyPair = {
  publicKey: new Uint8Array(32).fill(1),
  privateKey: new Uint8Array(64).fill(2),
  algorithm: 'kyber-768',
  securityLevel: 3,
  createdAt: new Date(),
  metadata: {},
};

const mockEncapsulatedSecret = {
  ciphertext: new Uint8Array(100).fill(3),
  sharedSecret: new Uint8Array(32).fill(4),
};

const mockSignature = {
  signature: new Uint8Array(3293).fill(5),
  algorithm: 'dilithium-3',
  timestamp: new Date(),
  metadata: {},
};

export const PQCAlgorithm = {
  KYBER_512: 'kyber-512',
  KYBER_768: 'kyber-768',
  KYBER_1024: 'kyber-1024',
  DILITHIUM_2: 'dilithium-2',
  DILITHIUM_3: 'dilithium-3',
  DILITHIUM_5: 'dilithium-5',
  FALCON_512: 'falcon-512',
  FALCON_1024: 'falcon-1024',
  SPHINCS_PLUS_128F: 'sphincs-plus-128f',
  SPHINCS_PLUS_128S: 'sphincs-plus-128s',
  SPHINCS_PLUS_192F: 'sphincs-plus-192f',
  SPHINCS_PLUS_192S: 'sphincs-plus-192s',
  SPHINCS_PLUS_256F: 'sphincs-plus-256f',
  SPHINCS_PLUS_256S: 'sphincs-plus-256s',
} as const;

export const SecurityLevel = {
  LEVEL_1: 1,
  LEVEL_2: 2,
  LEVEL_3: 3,
  LEVEL_4: 4,
  LEVEL_5: 5,
} as const;

export class KyberKEM {}
export class DilithiumSignature {}
export class FalconSignature {}
export class SphincsSignature {}
export class HybridKEM {}
export class PQCValidator {}
export class PQCBenchmarker {}
export class KeyPair {}
export class Signature {}
export class EncapsulatedSecret {}

export const createKyberKEM = () => ({
  generateKeyPair: async () => mockKeyPair,
  encapsulate: async () => mockEncapsulatedSecret,
  decapsulate: async () => new Uint8Array(32).fill(4),
  getAlgorithm: () => 'kyber-768',
  getSecurityLevel: () => 3,
});

export const createDilithiumSignature = () => ({
  generateKeyPair: async () => ({
    ...mockKeyPair,
    algorithm: 'dilithium-3',
    publicKey: new Uint8Array(1952).fill(1),
    privateKey: new Uint8Array(4000).fill(2),
  }),
  sign: async () => mockSignature,
  verify: async () => true,
  getAlgorithm: () => 'dilithium-3',
  getSecurityLevel: () => 3,
});

export const createFalconSignature = () => ({
  generateKeyPair: async () => ({
    ...mockKeyPair,
    algorithm: 'falcon-512',
  }),
  sign: async () => mockSignature,
  verify: async () => true,
  getAlgorithm: () => 'falcon-512',
  getSecurityLevel: () => 1,
});

export const createSphincsSignature = () => ({
  generateKeyPair: async () => ({
    ...mockKeyPair,
    algorithm: 'sphincs-plus-128f',
  }),
  sign: async () => mockSignature,
  verify: async () => true,
  getAlgorithm: () => 'sphincs-plus-128f',
  getSecurityLevel: () => 1,
});

export const createHybridKEM = () => ({
  generateKeyPair: async () => mockKeyPair,
  encapsulate: async () => mockEncapsulatedSecret,
  decapsulate: async () => new Uint8Array(32).fill(4),
  getAlgorithm: () => 'kyber-768',
  getSecurityLevel: () => 3,
});

export const createValidator = () => ({
  validateKEM: async () => true,
  validateSignature: async () => true,
});

export const createBenchmarker = () => ({
  benchmarkKEM: async () => [],
  benchmarkSignature: async () => [],
  formatResults: () => 'Benchmark results',
});
