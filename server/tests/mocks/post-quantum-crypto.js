"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBenchmarker = exports.createValidator = exports.createHybridKEM = exports.createSphincsSignature = exports.createFalconSignature = exports.createDilithiumSignature = exports.createKyberKEM = exports.EncapsulatedSecret = exports.Signature = exports.KeyPair = exports.PQCBenchmarker = exports.PQCValidator = exports.HybridKEM = exports.SphincsSignature = exports.FalconSignature = exports.DilithiumSignature = exports.KyberKEM = exports.SecurityLevel = exports.PQCAlgorithm = void 0;
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
exports.PQCAlgorithm = {
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
};
exports.SecurityLevel = {
    LEVEL_1: 1,
    LEVEL_2: 2,
    LEVEL_3: 3,
    LEVEL_4: 4,
    LEVEL_5: 5,
};
class KyberKEM {
}
exports.KyberKEM = KyberKEM;
class DilithiumSignature {
}
exports.DilithiumSignature = DilithiumSignature;
class FalconSignature {
}
exports.FalconSignature = FalconSignature;
class SphincsSignature {
}
exports.SphincsSignature = SphincsSignature;
class HybridKEM {
}
exports.HybridKEM = HybridKEM;
class PQCValidator {
}
exports.PQCValidator = PQCValidator;
class PQCBenchmarker {
}
exports.PQCBenchmarker = PQCBenchmarker;
class KeyPair {
}
exports.KeyPair = KeyPair;
class Signature {
}
exports.Signature = Signature;
class EncapsulatedSecret {
}
exports.EncapsulatedSecret = EncapsulatedSecret;
const createKyberKEM = () => ({
    generateKeyPair: async () => mockKeyPair,
    encapsulate: async () => mockEncapsulatedSecret,
    decapsulate: async () => new Uint8Array(32).fill(4),
    getAlgorithm: () => 'kyber-768',
    getSecurityLevel: () => 3,
});
exports.createKyberKEM = createKyberKEM;
const createDilithiumSignature = () => ({
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
exports.createDilithiumSignature = createDilithiumSignature;
const createFalconSignature = () => ({
    generateKeyPair: async () => ({
        ...mockKeyPair,
        algorithm: 'falcon-512',
    }),
    sign: async () => mockSignature,
    verify: async () => true,
    getAlgorithm: () => 'falcon-512',
    getSecurityLevel: () => 1,
});
exports.createFalconSignature = createFalconSignature;
const createSphincsSignature = () => ({
    generateKeyPair: async () => ({
        ...mockKeyPair,
        algorithm: 'sphincs-plus-128f',
    }),
    sign: async () => mockSignature,
    verify: async () => true,
    getAlgorithm: () => 'sphincs-plus-128f',
    getSecurityLevel: () => 1,
});
exports.createSphincsSignature = createSphincsSignature;
const createHybridKEM = () => ({
    generateKeyPair: async () => mockKeyPair,
    encapsulate: async () => mockEncapsulatedSecret,
    decapsulate: async () => new Uint8Array(32).fill(4),
    getAlgorithm: () => 'kyber-768',
    getSecurityLevel: () => 3,
});
exports.createHybridKEM = createHybridKEM;
const createValidator = () => ({
    validateKEM: async () => true,
    validateSignature: async () => true,
});
exports.createValidator = createValidator;
const createBenchmarker = () => ({
    benchmarkKEM: async () => [],
    benchmarkSignature: async () => [],
    formatResults: () => 'Benchmark results',
});
exports.createBenchmarker = createBenchmarker;
