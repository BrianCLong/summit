/**
 * Post-Quantum Cryptography GraphQL Resolvers
 * Implements resolvers for PQC operations
 */

import { PubSub } from 'graphql-subscriptions';
import {
  quantumCryptoService,
  PQCKeyStore,
} from '../services/QuantumResistantCryptoService';
import { PQCAlgorithm as PQCAlgorithmEnum } from '@summit/post-quantum-crypto';

// PubSub for subscriptions
const pubsub = new PubSub();

// Event names
const PQC_KEY_GENERATED = 'PQC_KEY_GENERATED';
const PQC_KEY_EXPIRING = 'PQC_KEY_EXPIRING';
const PQC_OPERATION = 'PQC_OPERATION';

// Wire up service events to pubsub
quantumCryptoService.on('keyGenerated', (data) => {
  pubsub.publish(PQC_KEY_GENERATED, { pqcKeyGenerated: data });
});

quantumCryptoService.on('keyExpiringWarning', (data) => {
  pubsub.publish(PQC_KEY_EXPIRING, { pqcKeyExpiringWarning: data });
});

quantumCryptoService.on('operation', (data) => {
  pubsub.publish(PQC_OPERATION, { pqcOperation: data });
});

// Helper to convert Uint8Array to base64
function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

// Helper to convert base64 to Uint8Array
function fromBase64(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

// Helper to map algorithm string to enum
function mapAlgorithm(algorithm: string): PQCAlgorithmEnum {
  const mapping: Record<string, PQCAlgorithmEnum> = {
    KYBER_512: PQCAlgorithmEnum.KYBER_512,
    KYBER_768: PQCAlgorithmEnum.KYBER_768,
    KYBER_1024: PQCAlgorithmEnum.KYBER_1024,
    DILITHIUM_2: PQCAlgorithmEnum.DILITHIUM_2,
    DILITHIUM_3: PQCAlgorithmEnum.DILITHIUM_3,
    DILITHIUM_5: PQCAlgorithmEnum.DILITHIUM_5,
    FALCON_512: PQCAlgorithmEnum.FALCON_512,
    FALCON_1024: PQCAlgorithmEnum.FALCON_1024,
    SPHINCS_PLUS_128F: PQCAlgorithmEnum.SPHINCS_PLUS_128F,
    SPHINCS_PLUS_128S: PQCAlgorithmEnum.SPHINCS_PLUS_128S,
    SPHINCS_PLUS_192F: PQCAlgorithmEnum.SPHINCS_PLUS_192F,
    SPHINCS_PLUS_192S: PQCAlgorithmEnum.SPHINCS_PLUS_192S,
    SPHINCS_PLUS_256F: PQCAlgorithmEnum.SPHINCS_PLUS_256F,
    SPHINCS_PLUS_256S: PQCAlgorithmEnum.SPHINCS_PLUS_256S,
  };
  return mapping[algorithm] || PQCAlgorithmEnum.KYBER_768;
}

// Helper to format key for GraphQL response
function formatKey(key: PQCKeyStore): object {
  return {
    keyId: key.keyId,
    algorithm: key.algorithm.toUpperCase().replace(/-/g, '_'),
    publicKey: toBase64(key.publicKey),
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() || null,
    metadata: key.metadata,
    isHybrid: key.metadata?.hybrid === true,
  };
}

export const pqcResolvers = {
  Query: {
    pqcKey: async (_: unknown, { keyId }: { keyId: string }) => {
      const key = quantumCryptoService.getKey(keyId);
      if (!key) return null;
      return formatKey(key);
    },

    pqcPublicKey: async (_: unknown, { keyId }: { keyId: string }) => {
      const publicKey = quantumCryptoService.getPublicKey(keyId);
      if (!publicKey) return null;
      return toBase64(publicKey);
    },

    pqcKeys: async (
      _: unknown,
      {
        algorithm,
        includeExpired,
      }: { algorithm?: string; includeExpired?: boolean }
    ) => {
      const keys = quantumCryptoService.listKeys({
        algorithm: algorithm ? mapAlgorithm(algorithm) : undefined,
        includeExpired: includeExpired || false,
      });
      return keys.map(formatKey);
    },

    pqcSupportedAlgorithms: async () => {
      const algorithms = quantumCryptoService.getSupportedAlgorithms();
      return {
        kem: algorithms.kem.map((a) => a.toUpperCase().replace(/-/g, '_')),
        signature: algorithms.signature.map((a) =>
          a.toUpperCase().replace(/-/g, '_')
        ),
      };
    },

    pqcStatistics: async () => {
      return quantumCryptoService.getStatistics();
    },

    pqcQuantumRiskReport: async () => {
      const report = await quantumCryptoService.getQuantumRiskReport();
      return {
        ...report,
        timestamp: report.timestamp.toISOString(),
        overallRiskLevel: report.overallRiskLevel.toUpperCase(),
      };
    },
  },

  Mutation: {
    pqcGenerateKeyPair: async (
      _: unknown,
      {
        algorithm,
        keyId,
        expiresInDays,
        metadata,
      }: {
        algorithm: string;
        keyId?: string;
        expiresInDays?: number;
        metadata?: Record<string, unknown>;
      }
    ) => {
      const key = await quantumCryptoService.generateKeyPair(
        mapAlgorithm(algorithm),
        {
          keyId,
          expiresInDays,
          metadata,
        }
      );
      return formatKey(key);
    },

    pqcGenerateHybridKeyPair: async (
      _: unknown,
      {
        classicalAlgorithm,
        quantumSecurityLevel,
        expiresInDays,
      }: {
        classicalAlgorithm?: 'x25519' | 'p256';
        quantumSecurityLevel?: string;
        expiresInDays?: number;
      }
    ) => {
      const securityLevelMap: Record<string, number> = {
        LEVEL_1: 1,
        LEVEL_2: 2,
        LEVEL_3: 3,
        LEVEL_4: 4,
        LEVEL_5: 5,
      };

      const key = await quantumCryptoService.generateHybridKeyPair({
        classicalAlgorithm: classicalAlgorithm || 'x25519',
        quantumSecurityLevel: quantumSecurityLevel
          ? securityLevelMap[quantumSecurityLevel]
          : undefined,
        expiresInDays,
      });
      return formatKey(key);
    },

    pqcEncapsulate: async (_: unknown, { keyId }: { keyId: string }) => {
      const result = await quantumCryptoService.encapsulate(keyId);

      // Return ciphertext and a hash of the shared secret (not the secret itself)
      const crypto = await import('crypto');
      const secretHash = crypto
        .createHash('sha256')
        .update(result.sharedSecret)
        .digest('hex');

      return {
        ciphertext: toBase64(result.ciphertext),
        sharedSecretHash: secretHash,
      };
    },

    pqcDecapsulate: async (
      _: unknown,
      { keyId, ciphertext }: { keyId: string; ciphertext: string }
    ) => {
      const sharedSecret = await quantumCryptoService.decapsulate(
        keyId,
        fromBase64(ciphertext)
      );

      // Return hash of shared secret, not the secret itself
      const crypto = await import('crypto');
      return crypto.createHash('sha256').update(sharedSecret).digest('hex');
    },

    pqcSign: async (
      _: unknown,
      { keyId, message }: { keyId: string; message: string }
    ) => {
      const messageBytes = new TextEncoder().encode(message);
      const result = await quantumCryptoService.sign(keyId, messageBytes);

      return {
        signature: toBase64(result.signature),
        algorithm: result.algorithm.toUpperCase().replace(/-/g, '_'),
        timestamp: result.timestamp.toISOString(),
        metadata: result.metadata,
      };
    },

    pqcVerify: async (
      _: unknown,
      {
        keyId,
        message,
        signature,
      }: { keyId: string; message: string; signature: string }
    ) => {
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = fromBase64(signature);

      const isValid = await quantumCryptoService.verify(
        keyId,
        messageBytes,
        signatureBytes
      );

      const key = quantumCryptoService.getKey(keyId);

      return {
        isValid,
        algorithm: key?.algorithm.toUpperCase().replace(/-/g, '_'),
        timestamp: new Date().toISOString(),
      };
    },

    pqcDeleteKey: async (_: unknown, { keyId }: { keyId: string }) => {
      return quantumCryptoService.deleteKey(keyId);
    },

    pqcRotateKey: async (_: unknown, { keyId }: { keyId: string }) => {
      const key = await quantumCryptoService.rotateKey(keyId);
      return formatKey(key);
    },

    pqcValidateAlgorithm: async (
      _: unknown,
      { algorithm }: { algorithm: string }
    ) => {
      const isValid = await quantumCryptoService.validateAlgorithm(
        mapAlgorithm(algorithm)
      );

      return {
        algorithm: algorithm,
        isValid,
        testedAt: new Date().toISOString(),
      };
    },

    pqcBenchmarkAlgorithm: async (
      _: unknown,
      { algorithm }: { algorithm: string }
    ) => {
      const formattedResults = await quantumCryptoService.benchmarkAlgorithm(
        mapAlgorithm(algorithm)
      );

      return {
        algorithm: algorithm,
        formattedResults,
      };
    },
  },

  Subscription: {
    pqcKeyGenerated: {
      subscribe: () => pubsub.asyncIterator([PQC_KEY_GENERATED]),
    },

    pqcKeyExpiringWarning: {
      subscribe: () => pubsub.asyncIterator([PQC_KEY_EXPIRING]),
    },

    pqcOperation: {
      subscribe: () => pubsub.asyncIterator([PQC_OPERATION]),
    },
  },
};

export default pqcResolvers;
