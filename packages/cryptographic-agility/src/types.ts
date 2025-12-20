/**
 * Cryptographic Agility Types
 * Defines interfaces for algorithm management and migration
 */

export enum CryptoOperation {
  KEY_ENCAPSULATION = 'key-encapsulation',
  DIGITAL_SIGNATURE = 'digital-signature',
  ENCRYPTION = 'encryption',
  HASHING = 'hashing',
  KEY_DERIVATION = 'key-derivation',
}

export enum AlgorithmStatus {
  APPROVED = 'approved',
  DEPRECATED = 'deprecated',
  OBSOLETE = 'obsolete',
  EXPERIMENTAL = 'experimental',
}

export interface AlgorithmMetadata {
  id: string;
  name: string;
  version: string;
  operation: CryptoOperation;
  status: AlgorithmStatus;
  securityLevel: number;
  quantumResistant: boolean;
  approvedDate: Date;
  deprecationDate?: Date;
  obsolescenceDate?: Date;
  complianceStandards: string[];
  performance: PerformanceMetrics;
  metadata?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  keygenSpeed: number; // ops/sec
  encryptionSpeed?: number; // ops/sec
  decryptionSpeed?: number; // ops/sec
  signSpeed?: number; // ops/sec
  verifySpeed?: number; // ops/sec
  keySize: number; // bytes
  ciphertextSize?: number; // bytes
  signatureSize?: number; // bytes
}

export interface CryptoInventoryItem {
  location: string; // File path or service identifier
  operation: CryptoOperation;
  algorithm: string;
  version: string;
  lastUpdated: Date;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  dataClassification: 'public' | 'internal' | 'confidential' | 'secret' | 'top-secret';
  migrationStatus: 'pending' | 'in-progress' | 'completed' | 'not-applicable';
}

export interface MigrationPlan {
  id: string;
  name: string;
  sourceAlgorithm: string;
  targetAlgorithm: string;
  priority: number;
  estimatedDuration: number; // hours
  dependencies: string[]; // Other migration plan IDs
  rollbackStrategy: string;
  validationCriteria: string[];
  status: 'draft' | 'approved' | 'in-progress' | 'completed' | 'rolled-back';
  createdAt: Date;
  updatedAt: Date;
}

export interface QuantumRiskAssessment {
  assetId: string;
  dataClassification: string;
  currentAlgorithm: string;
  quantumVulnerable: boolean;
  cryptographicLifetime: number; // years
  dataRetentionPeriod: number; // years
  harvestNowDecryptLaterRisk: 'low' | 'medium' | 'high' | 'critical';
  timeToQuantumThreat: number; // years (estimated)
  migrationUrgency: 'low' | 'medium' | 'high' | 'immediate';
  recommendedActions: string[];
}

export interface AlgorithmRegistry {
  register(metadata: AlgorithmMetadata): void;
  get(algorithmId: string): AlgorithmMetadata | undefined;
  list(filter?: Partial<AlgorithmMetadata>): AlgorithmMetadata[];
  deprecate(algorithmId: string, deprecationDate: Date): void;
  obsolete(algorithmId: string, obsolescenceDate: Date): void;
}

export interface CryptoInventory {
  scan(paths: string[]): Promise<CryptoInventoryItem[]>;
  add(item: CryptoInventoryItem): void;
  update(location: string, updates: Partial<CryptoInventoryItem>): void;
  getAll(): CryptoInventoryItem[];
  getByStatus(status: CryptoInventoryItem['migrationStatus']): CryptoInventoryItem[];
  getHighPriority(): CryptoInventoryItem[];
}

export interface MigrationPlanner {
  createPlan(source: string, target: string): MigrationPlan;
  updatePlan(planId: string, updates: Partial<MigrationPlan>): void;
  getPlan(planId: string): MigrationPlan | undefined;
  listPlans(status?: MigrationPlan['status']): MigrationPlan[];
  validatePlan(planId: string): Promise<boolean>;
}
