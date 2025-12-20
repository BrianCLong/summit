/**
 * Algorithm Registry
 * Central registry for all cryptographic algorithms
 */

import { AlgorithmMetadata, AlgorithmRegistry, AlgorithmStatus } from '../types';

export class AlgorithmRegistryImpl implements AlgorithmRegistry {
  private algorithms: Map<string, AlgorithmMetadata> = new Map();

  constructor() {
    this.initializeDefaultAlgorithms();
  }

  register(metadata: AlgorithmMetadata): void {
    if (this.algorithms.has(metadata.id)) {
      throw new Error(`Algorithm ${metadata.id} is already registered`);
    }

    this.algorithms.set(metadata.id, { ...metadata });
  }

  get(algorithmId: string): AlgorithmMetadata | undefined {
    return this.algorithms.get(algorithmId);
  }

  list(filter?: Partial<AlgorithmMetadata>): AlgorithmMetadata[] {
    const allAlgorithms = Array.from(this.algorithms.values());

    if (!filter) {
      return allAlgorithms;
    }

    return allAlgorithms.filter(algo => {
      return Object.entries(filter).every(([key, value]) => {
        const algoValue = algo[key as keyof AlgorithmMetadata];
        return algoValue === value;
      });
    });
  }

  deprecate(algorithmId: string, deprecationDate: Date): void {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) {
      throw new Error(`Algorithm ${algorithmId} not found`);
    }

    algorithm.status = AlgorithmStatus.DEPRECATED;
    algorithm.deprecationDate = deprecationDate;
  }

  obsolete(algorithmId: string, obsolescenceDate: Date): void {
    const algorithm = this.algorithms.get(algorithmId);
    if (!algorithm) {
      throw new Error(`Algorithm ${algorithmId} not found`);
    }

    algorithm.status = AlgorithmStatus.OBSOLETE;
    algorithm.obsolescenceDate = obsolescenceDate;
  }

  private initializeDefaultAlgorithms(): void {
    // Post-quantum algorithms
    this.registerPQCAlgorithms();

    // Classical algorithms
    this.registerClassicalAlgorithms();
  }

  private registerPQCAlgorithms(): void {
    // Kyber variants
    this.register({
      id: 'kyber-512',
      name: 'CRYSTALS-Kyber-512',
      version: '3.0',
      operation: 'key-encapsulation' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 1,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-203'],
      performance: {
        keygenSpeed: 50000,
        encryptionSpeed: 45000,
        decryptionSpeed: 40000,
        keySize: 800,
        ciphertextSize: 768,
      },
    });

    this.register({
      id: 'kyber-768',
      name: 'CRYSTALS-Kyber-768',
      version: '3.0',
      operation: 'key-encapsulation' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 3,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-203'],
      performance: {
        keygenSpeed: 35000,
        encryptionSpeed: 32000,
        decryptionSpeed: 28000,
        keySize: 1184,
        ciphertextSize: 1088,
      },
    });

    this.register({
      id: 'kyber-1024',
      name: 'CRYSTALS-Kyber-1024',
      version: '3.0',
      operation: 'key-encapsulation' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 5,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-203'],
      performance: {
        keygenSpeed: 25000,
        encryptionSpeed: 22000,
        decryptionSpeed: 20000,
        keySize: 1568,
        ciphertextSize: 1568,
      },
    });

    // Dilithium variants
    this.register({
      id: 'dilithium-2',
      name: 'CRYSTALS-Dilithium-2',
      version: '3.1',
      operation: 'digital-signature' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 2,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-204'],
      performance: {
        keygenSpeed: 15000,
        signSpeed: 12000,
        verifySpeed: 30000,
        keySize: 1312,
        signatureSize: 2420,
      },
    });

    this.register({
      id: 'dilithium-3',
      name: 'CRYSTALS-Dilithium-3',
      version: '3.1',
      operation: 'digital-signature' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 3,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-204'],
      performance: {
        keygenSpeed: 10000,
        signSpeed: 8000,
        verifySpeed: 20000,
        keySize: 1952,
        signatureSize: 3293,
      },
    });

    // FALCON variants
    this.register({
      id: 'falcon-512',
      name: 'FALCON-512',
      version: '1.2',
      operation: 'digital-signature' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 1,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-206'],
      performance: {
        keygenSpeed: 5000,
        signSpeed: 8000,
        verifySpeed: 25000,
        keySize: 897,
        signatureSize: 666,
      },
    });

    // SPHINCS+ variants
    this.register({
      id: 'sphincs-plus-128f',
      name: 'SPHINCS+-128f',
      version: '3.1',
      operation: 'digital-signature' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 1,
      quantumResistant: true,
      approvedDate: new Date('2024-01-01'),
      complianceStandards: ['NIST-FIPS-205'],
      performance: {
        keygenSpeed: 20000,
        signSpeed: 100,
        verifySpeed: 10000,
        keySize: 32,
        signatureSize: 17088,
      },
    });
  }

  private registerClassicalAlgorithms(): void {
    this.register({
      id: 'rsa-2048',
      name: 'RSA-2048',
      version: '1.0',
      operation: 'digital-signature' as any,
      status: AlgorithmStatus.DEPRECATED,
      securityLevel: 2,
      quantumResistant: false,
      approvedDate: new Date('2000-01-01'),
      deprecationDate: new Date('2025-01-01'),
      complianceStandards: ['FIPS-186-4'],
      performance: {
        keygenSpeed: 100,
        signSpeed: 5000,
        verifySpeed: 50000,
        keySize: 256,
        signatureSize: 256,
      },
    });

    this.register({
      id: 'ecdsa-p256',
      name: 'ECDSA-P256',
      version: '1.0',
      operation: 'digital-signature' as any,
      status: AlgorithmStatus.DEPRECATED,
      securityLevel: 3,
      quantumResistant: false,
      approvedDate: new Date('2000-01-01'),
      deprecationDate: new Date('2025-01-01'),
      complianceStandards: ['FIPS-186-4'],
      performance: {
        keygenSpeed: 10000,
        signSpeed: 15000,
        verifySpeed: 8000,
        keySize: 32,
        signatureSize: 64,
      },
    });

    this.register({
      id: 'aes-256-gcm',
      name: 'AES-256-GCM',
      version: '1.0',
      operation: 'encryption' as any,
      status: AlgorithmStatus.APPROVED,
      securityLevel: 5,
      quantumResistant: false,
      approvedDate: new Date('2000-01-01'),
      complianceStandards: ['FIPS-197', 'NIST-SP-800-38D'],
      performance: {
        keygenSpeed: 1000000,
        encryptionSpeed: 500000,
        decryptionSpeed: 500000,
        keySize: 32,
        ciphertextSize: 16, // overhead
      },
    });
  }
}

export function createAlgorithmRegistry(): AlgorithmRegistry {
  return new AlgorithmRegistryImpl();
}
