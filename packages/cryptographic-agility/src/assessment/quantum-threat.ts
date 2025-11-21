/**
 * Quantum Threat Assessment
 * Tools for assessing and mitigating quantum computing threats
 */

/**
 * Cryptographic algorithm vulnerability classification
 */
export enum QuantumVulnerability {
  SAFE = 'safe',
  PARTIALLY_VULNERABLE = 'partially-vulnerable',
  FULLY_VULNERABLE = 'fully-vulnerable',
  UNKNOWN = 'unknown',
}

/**
 * Algorithm security assessment
 */
export interface AlgorithmAssessment {
  algorithm: string;
  category: 'symmetric' | 'asymmetric' | 'hash' | 'signature' | 'key-exchange';
  vulnerability: QuantumVulnerability;
  quantumAttack: string | null;
  classicalSecurityBits: number;
  quantumSecurityBits: number;
  recommendation: string;
  migrationPriority: 'immediate' | 'high' | 'medium' | 'low';
}

/**
 * Asset risk assessment result
 */
export interface AssetRiskAssessment {
  assetId: string;
  assetName: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'secret' | 'top-secret';
  currentAlgorithms: AlgorithmAssessment[];
  dataRetentionYears: number;
  harvestNowDecryptLaterRisk: 'critical' | 'high' | 'medium' | 'low';
  migrationUrgency: 'immediate' | 'urgent' | 'planned' | 'monitor';
  estimatedYearsToQuantumThreat: number;
  overallRiskScore: number;
  recommendations: string[];
}

/**
 * Timeline estimate for quantum computing milestones
 */
export interface QuantumTimeline {
  year: number;
  milestone: string;
  probability: number;
  impact: string;
}

/**
 * Quantum Threat Assessor
 * Analyzes cryptographic vulnerabilities and provides migration guidance
 */
export class QuantumThreatAssessor {
  private algorithmDatabase: Map<string, AlgorithmAssessment>;
  private quantumTimeline: QuantumTimeline[];

  constructor() {
    this.algorithmDatabase = this.initializeAlgorithmDatabase();
    this.quantumTimeline = this.initializeTimeline();
  }

  /**
   * Assess a single algorithm
   */
  assessAlgorithm(algorithmName: string): AlgorithmAssessment | null {
    const normalizedName = algorithmName.toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const [key, assessment] of this.algorithmDatabase) {
      if (key.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalizedName) ||
          normalizedName.includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
        return { ...assessment };
      }
    }

    return null;
  }

  /**
   * Assess asset risk
   */
  assessAssetRisk(
    assetId: string,
    assetName: string,
    algorithms: string[],
    dataClassification: AssetRiskAssessment['dataClassification'],
    dataRetentionYears: number
  ): AssetRiskAssessment {
    const algorithmAssessments = algorithms
      .map(alg => this.assessAlgorithm(alg))
      .filter((a): a is AlgorithmAssessment => a !== null);

    // Calculate harvest-now-decrypt-later risk
    const yearsToQuantum = this.estimateYearsToQuantumThreat();
    const harvestRisk = this.calculateHarvestRisk(
      algorithmAssessments,
      dataClassification,
      dataRetentionYears,
      yearsToQuantum
    );

    // Determine migration urgency
    const migrationUrgency = this.determineMigrationUrgency(
      harvestRisk,
      algorithmAssessments,
      dataClassification
    );

    // Calculate overall risk score (0-100)
    const overallRiskScore = this.calculateOverallRisk(
      algorithmAssessments,
      dataClassification,
      dataRetentionYears,
      yearsToQuantum
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      algorithmAssessments,
      harvestRisk,
      dataClassification,
      dataRetentionYears
    );

    return {
      assetId,
      assetName,
      dataClassification,
      currentAlgorithms: algorithmAssessments,
      dataRetentionYears,
      harvestNowDecryptLaterRisk: harvestRisk,
      migrationUrgency,
      estimatedYearsToQuantumThreat: yearsToQuantum,
      overallRiskScore,
      recommendations,
    };
  }

  /**
   * Get quantum computing timeline predictions
   */
  getQuantumTimeline(): QuantumTimeline[] {
    return [...this.quantumTimeline];
  }

  /**
   * Estimate years until cryptographically relevant quantum computers
   */
  estimateYearsToQuantumThreat(): number {
    // Conservative estimate based on current research
    // This should be updated as quantum computing advances
    return 8; // 2033 estimate for RSA-2048 break
  }

  /**
   * Generate migration roadmap
   */
  generateMigrationRoadmap(assessments: AssetRiskAssessment[]): MigrationRoadmap {
    // Sort by risk score (descending)
    const sorted = [...assessments].sort((a, b) => b.overallRiskScore - a.overallRiskScore);

    const phases: MigrationPhase[] = [];

    // Phase 1: Immediate (top 20% risk, immediate urgency)
    const immediate = sorted.filter(a => a.migrationUrgency === 'immediate');
    if (immediate.length > 0) {
      phases.push({
        name: 'Phase 1: Critical Assets',
        description: 'Immediate migration of highest-risk assets',
        assets: immediate.map(a => a.assetId),
        duration: '0-3 months',
        priority: 1,
      });
    }

    // Phase 2: Urgent (urgent, high risk)
    const urgent = sorted.filter(a => a.migrationUrgency === 'urgent');
    if (urgent.length > 0) {
      phases.push({
        name: 'Phase 2: High Priority Assets',
        description: 'Migration of high-risk assets',
        assets: urgent.map(a => a.assetId),
        duration: '3-9 months',
        priority: 2,
      });
    }

    // Phase 3: Planned (planned, medium risk)
    const planned = sorted.filter(a => a.migrationUrgency === 'planned');
    if (planned.length > 0) {
      phases.push({
        name: 'Phase 3: Scheduled Migration',
        description: 'Planned migration of remaining assets',
        assets: planned.map(a => a.assetId),
        duration: '9-18 months',
        priority: 3,
      });
    }

    // Phase 4: Monitor (low risk)
    const monitor = sorted.filter(a => a.migrationUrgency === 'monitor');
    if (monitor.length > 0) {
      phases.push({
        name: 'Phase 4: Monitoring',
        description: 'Continue monitoring, migrate as needed',
        assets: monitor.map(a => a.assetId),
        duration: '18+ months',
        priority: 4,
      });
    }

    return {
      totalAssets: assessments.length,
      averageRiskScore: assessments.reduce((a, b) => a + b.overallRiskScore, 0) / assessments.length,
      phases,
      estimatedTotalDuration: '18-24 months',
      generatedAt: new Date(),
    };
  }

  private initializeAlgorithmDatabase(): Map<string, AlgorithmAssessment> {
    const db = new Map<string, AlgorithmAssessment>();

    // Asymmetric algorithms (fully vulnerable to Shor's algorithm)
    db.set('RSA', {
      algorithm: 'RSA',
      category: 'asymmetric',
      vulnerability: QuantumVulnerability.FULLY_VULNERABLE,
      quantumAttack: "Shor's algorithm",
      classicalSecurityBits: 112, // RSA-2048
      quantumSecurityBits: 0,
      recommendation: 'Migrate to ML-KEM (Kyber) or hybrid scheme',
      migrationPriority: 'immediate',
    });

    db.set('ECDSA', {
      algorithm: 'ECDSA',
      category: 'signature',
      vulnerability: QuantumVulnerability.FULLY_VULNERABLE,
      quantumAttack: "Shor's algorithm",
      classicalSecurityBits: 128, // P-256
      quantumSecurityBits: 0,
      recommendation: 'Migrate to ML-DSA (Dilithium) or SLH-DSA (SPHINCS+)',
      migrationPriority: 'immediate',
    });

    db.set('ECDH', {
      algorithm: 'ECDH',
      category: 'key-exchange',
      vulnerability: QuantumVulnerability.FULLY_VULNERABLE,
      quantumAttack: "Shor's algorithm",
      classicalSecurityBits: 128,
      quantumSecurityBits: 0,
      recommendation: 'Migrate to ML-KEM (Kyber) or X25519+Kyber hybrid',
      migrationPriority: 'immediate',
    });

    db.set('DSA', {
      algorithm: 'DSA',
      category: 'signature',
      vulnerability: QuantumVulnerability.FULLY_VULNERABLE,
      quantumAttack: "Shor's algorithm",
      classicalSecurityBits: 80,
      quantumSecurityBits: 0,
      recommendation: 'Migrate to ML-DSA (Dilithium)',
      migrationPriority: 'immediate',
    });

    db.set('DH', {
      algorithm: 'Diffie-Hellman',
      category: 'key-exchange',
      vulnerability: QuantumVulnerability.FULLY_VULNERABLE,
      quantumAttack: "Shor's algorithm",
      classicalSecurityBits: 112,
      quantumSecurityBits: 0,
      recommendation: 'Migrate to ML-KEM (Kyber)',
      migrationPriority: 'immediate',
    });

    // Symmetric algorithms (partially vulnerable to Grover's algorithm)
    db.set('AES-128', {
      algorithm: 'AES-128',
      category: 'symmetric',
      vulnerability: QuantumVulnerability.PARTIALLY_VULNERABLE,
      quantumAttack: "Grover's algorithm (halves effective key size)",
      classicalSecurityBits: 128,
      quantumSecurityBits: 64,
      recommendation: 'Upgrade to AES-256 for quantum resistance',
      migrationPriority: 'medium',
    });

    db.set('AES-256', {
      algorithm: 'AES-256',
      category: 'symmetric',
      vulnerability: QuantumVulnerability.SAFE,
      quantumAttack: "Grover's algorithm (128-bit quantum security)",
      classicalSecurityBits: 256,
      quantumSecurityBits: 128,
      recommendation: 'Quantum-safe, no migration needed',
      migrationPriority: 'low',
    });

    // Hash functions (partially vulnerable)
    db.set('SHA-256', {
      algorithm: 'SHA-256',
      category: 'hash',
      vulnerability: QuantumVulnerability.SAFE,
      quantumAttack: "Grover's algorithm (128-bit quantum security)",
      classicalSecurityBits: 256,
      quantumSecurityBits: 128,
      recommendation: 'Quantum-safe for most applications',
      migrationPriority: 'low',
    });

    db.set('SHA-512', {
      algorithm: 'SHA-512',
      category: 'hash',
      vulnerability: QuantumVulnerability.SAFE,
      quantumAttack: "Grover's algorithm (256-bit quantum security)",
      classicalSecurityBits: 512,
      quantumSecurityBits: 256,
      recommendation: 'Highly quantum-resistant',
      migrationPriority: 'low',
    });

    // Post-quantum algorithms (safe)
    db.set('Kyber', {
      algorithm: 'ML-KEM (Kyber)',
      category: 'key-exchange',
      vulnerability: QuantumVulnerability.SAFE,
      quantumAttack: null,
      classicalSecurityBits: 192, // Kyber-768
      quantumSecurityBits: 192,
      recommendation: 'Already quantum-safe',
      migrationPriority: 'low',
    });

    db.set('Dilithium', {
      algorithm: 'ML-DSA (Dilithium)',
      category: 'signature',
      vulnerability: QuantumVulnerability.SAFE,
      quantumAttack: null,
      classicalSecurityBits: 192,
      quantumSecurityBits: 192,
      recommendation: 'Already quantum-safe',
      migrationPriority: 'low',
    });

    db.set('SPHINCS+', {
      algorithm: 'SLH-DSA (SPHINCS+)',
      category: 'signature',
      vulnerability: QuantumVulnerability.SAFE,
      quantumAttack: null,
      classicalSecurityBits: 256,
      quantumSecurityBits: 256,
      recommendation: 'Already quantum-safe, stateless hash-based',
      migrationPriority: 'low',
    });

    return db;
  }

  private initializeTimeline(): QuantumTimeline[] {
    return [
      {
        year: 2025,
        milestone: 'NIST PQC standards finalized',
        probability: 1.0,
        impact: 'Migration should begin',
      },
      {
        year: 2027,
        milestone: 'Error-corrected logical qubits demonstrated',
        probability: 0.7,
        impact: 'Timeline to CRQC becomes clearer',
      },
      {
        year: 2030,
        milestone: 'Cryptographically Relevant Quantum Computers (CRQC) - Early',
        probability: 0.3,
        impact: 'RSA-2048, ECDSA vulnerable',
      },
      {
        year: 2033,
        milestone: 'CRQC - Conservative estimate',
        probability: 0.6,
        impact: 'Most classical public-key crypto broken',
      },
      {
        year: 2035,
        milestone: 'CRQC - High confidence',
        probability: 0.8,
        impact: 'All non-PQC asymmetric crypto vulnerable',
      },
      {
        year: 2040,
        milestone: 'Fault-tolerant quantum computing mainstream',
        probability: 0.7,
        impact: 'Quantum advantage for many applications',
      },
    ];
  }

  private calculateHarvestRisk(
    algorithms: AlgorithmAssessment[],
    classification: AssetRiskAssessment['dataClassification'],
    retentionYears: number,
    yearsToQuantum: number
  ): AssetRiskAssessment['harvestNowDecryptLaterRisk'] {
    const hasVulnerableAlgorithm = algorithms.some(
      a => a.vulnerability === QuantumVulnerability.FULLY_VULNERABLE
    );

    if (!hasVulnerableAlgorithm) {
      return 'low';
    }

    const dataExtendsPassQuantum = retentionYears > yearsToQuantum;
    const isHighlyClassified = ['secret', 'top-secret'].includes(classification);

    if (dataExtendsPassQuantum && isHighlyClassified) {
      return 'critical';
    }

    if (dataExtendsPassQuantum || isHighlyClassified) {
      return 'high';
    }

    if (retentionYears > yearsToQuantum * 0.7) {
      return 'medium';
    }

    return 'low';
  }

  private determineMigrationUrgency(
    harvestRisk: AssetRiskAssessment['harvestNowDecryptLaterRisk'],
    algorithms: AlgorithmAssessment[],
    classification: AssetRiskAssessment['dataClassification']
  ): AssetRiskAssessment['migrationUrgency'] {
    if (harvestRisk === 'critical') {
      return 'immediate';
    }

    if (harvestRisk === 'high') {
      return 'urgent';
    }

    const allImmediate = algorithms.every(a => a.migrationPriority === 'immediate');
    if (allImmediate && ['confidential', 'secret', 'top-secret'].includes(classification)) {
      return 'urgent';
    }

    if (harvestRisk === 'medium') {
      return 'planned';
    }

    return 'monitor';
  }

  private calculateOverallRisk(
    algorithms: AlgorithmAssessment[],
    classification: AssetRiskAssessment['dataClassification'],
    retentionYears: number,
    yearsToQuantum: number
  ): number {
    let score = 0;

    // Algorithm vulnerability (0-40 points)
    const vulnerableCount = algorithms.filter(
      a => a.vulnerability === QuantumVulnerability.FULLY_VULNERABLE
    ).length;
    score += Math.min(40, vulnerableCount * 20);

    // Data classification (0-30 points)
    const classificationScores: Record<string, number> = {
      'public': 0,
      'internal': 10,
      'confidential': 20,
      'secret': 27,
      'top-secret': 30,
    };
    score += classificationScores[classification] || 0;

    // Retention vs quantum timeline (0-30 points)
    const yearsOverQuantum = retentionYears - yearsToQuantum;
    if (yearsOverQuantum > 0) {
      score += Math.min(30, yearsOverQuantum * 6);
    }

    return Math.min(100, score);
  }

  private generateRecommendations(
    algorithms: AlgorithmAssessment[],
    harvestRisk: AssetRiskAssessment['harvestNowDecryptLaterRisk'],
    classification: AssetRiskAssessment['dataClassification'],
    retentionYears: number
  ): string[] {
    const recommendations: string[] = [];

    // Algorithm-specific recommendations
    for (const alg of algorithms) {
      if (alg.vulnerability === QuantumVulnerability.FULLY_VULNERABLE) {
        recommendations.push(alg.recommendation);
      }
    }

    // Risk-level recommendations
    if (harvestRisk === 'critical') {
      recommendations.push('Implement hybrid classical-quantum encryption immediately');
      recommendations.push('Consider re-encrypting sensitive archived data');
      recommendations.push('Prioritize this asset in PQC migration');
    } else if (harvestRisk === 'high') {
      recommendations.push('Plan migration to PQC within 12 months');
      recommendations.push('Implement cryptographic agility for easy algorithm upgrades');
    } else if (harvestRisk === 'medium') {
      recommendations.push('Include in PQC migration roadmap');
      recommendations.push('Monitor quantum computing developments');
    }

    // General recommendations
    if (['secret', 'top-secret'].includes(classification)) {
      recommendations.push('Apply defense-in-depth with multiple encryption layers');
    }

    if (retentionYears > 10) {
      recommendations.push('Use SPHINCS+ for long-term signatures (stateless, hash-based)');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

/**
 * Migration phase definition
 */
export interface MigrationPhase {
  name: string;
  description: string;
  assets: string[];
  duration: string;
  priority: number;
}

/**
 * Complete migration roadmap
 */
export interface MigrationRoadmap {
  totalAssets: number;
  averageRiskScore: number;
  phases: MigrationPhase[];
  estimatedTotalDuration: string;
  generatedAt: Date;
}

/**
 * Create threat assessor instance
 */
export function createQuantumThreatAssessor(): QuantumThreatAssessor {
  return new QuantumThreatAssessor();
}
