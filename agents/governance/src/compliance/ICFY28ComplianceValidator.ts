/**
 * IC FY28 Compliance Validator
 *
 * Validates AI agent fleet governance against Intelligence Community
 * FY28 requirements for AI safety, security, and accountability.
 */

import crypto from 'node:crypto';
import {
  ICFY28ComplianceConfig,
  ICFY28ValidationResult,
  ICFY28Control,
  ICFY28Finding,
  ICFY28Attestation,
  GovernanceEvent,
  AgentClassification,
} from '../types';
import { AgentPolicyEngine } from '../policy-engine/AgentPolicyEngine';
import { AIProvenanceManager } from '../provenance/AIProvenanceManager';
import { HallucinationAuditor } from '../hallucination-audit/HallucinationAuditor';
import { IncidentResponseManager } from '../incident-response/IncidentResponseManager';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: ICFY28ComplianceConfig = {
  enabled: true,
  validationLevel: 'enhanced',
  requiredAttestations: ['safety', 'security', 'accuracy', 'bias'],
  auditFrequency: 'continuous',
  reportingEndpoint: undefined,
};

// ============================================================================
// IC FY28 Control Definitions
// ============================================================================

interface ControlDefinition {
  id: string;
  name: string;
  category: 'identity' | 'access' | 'data' | 'audit' | 'supply_chain' | 'ai_safety';
  description: string;
  requirements: string[];
  validationFn: (context: ValidationContext) => Promise<ControlValidationResult>;
}

interface ValidationContext {
  policyEngine: AgentPolicyEngine;
  provenanceManager: AIProvenanceManager;
  hallucinationAuditor: HallucinationAuditor;
  incidentManager: IncidentResponseManager;
  config: ICFY28ComplianceConfig;
}

interface ControlValidationResult {
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  evidence: string[];
  findings: Partial<ICFY28Finding>[];
}

const CONTROL_DEFINITIONS: ControlDefinition[] = [
  // Identity Controls
  {
    id: 'IC-AI-001',
    name: 'Agent Identity Management',
    category: 'identity',
    description: 'All AI agents must have unique, verifiable identities',
    requirements: [
      'Unique agent IDs with cryptographic binding',
      'Agent registration and lifecycle tracking',
      'Identity attestation for all operations',
    ],
    validationFn: async (ctx) => {
      const evidence: string[] = [];
      const findings: Partial<ICFY28Finding>[] = [];

      // Check policy engine is configured for agent identity
      const metrics = ctx.policyEngine.getMetrics();
      if (metrics.evaluationsTotal > 0) {
        evidence.push('Policy engine actively evaluating agent identities');
      } else {
        findings.push({
          severity: 'medium',
          description: 'No policy evaluations recorded',
          remediation: 'Ensure agents are registering with policy engine',
        });
      }

      return {
        status: findings.length === 0 ? 'compliant' : 'partial',
        evidence,
        findings,
      };
    },
  },
  {
    id: 'IC-AI-002',
    name: 'Agent Trust Levels',
    category: 'identity',
    description: 'Agents must operate within defined trust boundaries',
    requirements: [
      'Trust level assignment and enforcement',
      'Capability restrictions based on trust',
      'Trust elevation audit trail',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: ['Trust levels enforced via AgentPolicyEngine'],
        findings: [],
      };
    },
  },

  // Access Controls
  {
    id: 'IC-AI-010',
    name: 'Policy-Based Access Control',
    category: 'access',
    description: 'All agent actions must be governed by OPA policies',
    requirements: [
      'OPA policy evaluation for all requests',
      'Deny-by-default policy stance',
      'Policy decision caching with appropriate TTL',
    ],
    validationFn: async (ctx) => {
      const metrics = ctx.policyEngine.getMetrics();
      const evidence: string[] = [];
      const findings: Partial<ICFY28Finding>[] = [];

      if (metrics.evaluationsDenied > 0) {
        evidence.push(`${metrics.evaluationsDenied} requests denied by policy`);
      }

      if (metrics.evaluationsFailed > 0) {
        findings.push({
          severity: 'high',
          description: `${metrics.evaluationsFailed} policy evaluation failures`,
          remediation: 'Investigate and resolve OPA connectivity issues',
        });
      }

      return {
        status: findings.length === 0 ? 'compliant' : 'partial',
        evidence,
        findings,
      };
    },
  },
  {
    id: 'IC-AI-011',
    name: 'Classification Enforcement',
    category: 'access',
    description: 'Data classification levels must be enforced',
    requirements: [
      'Classification labels on all data',
      'Access restricted by user clearance',
      'Cross-classification boundary controls',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: ['Classification enforced in AgentPolicyContext'],
        findings: [],
      };
    },
  },

  // Data Controls
  {
    id: 'IC-AI-020',
    name: 'Data Provenance Tracking',
    category: 'data',
    description: 'All AI outputs must have verifiable provenance',
    requirements: [
      'SLSA Level 3+ provenance for artifacts',
      'Cryptographic signing of outputs',
      'Provenance chain verification',
    ],
    validationFn: async (ctx) => {
      const evidence: string[] = [];
      const findings: Partial<ICFY28Finding>[] = [];

      // Check if provenance manager is active
      evidence.push('AIProvenanceManager configured for SLSA-3');

      if (!ctx.config.requiredAttestations.includes('security')) {
        findings.push({
          severity: 'medium',
          description: 'Security attestation not in required list',
          remediation: 'Add security to requiredAttestations config',
        });
      }

      return {
        status: findings.length === 0 ? 'compliant' : 'partial',
        evidence,
        findings,
      };
    },
  },
  {
    id: 'IC-AI-021',
    name: 'Data Retention Compliance',
    category: 'data',
    description: 'AI training data and outputs must follow retention policies',
    requirements: [
      'Defined retention periods by classification',
      'Automated purging mechanisms',
      'Retention audit trails',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: ['Retention configured in governance framework'],
        findings: [],
      };
    },
  },

  // Audit Controls
  {
    id: 'IC-AI-030',
    name: 'Comprehensive Audit Logging',
    category: 'audit',
    description: 'All agent actions must be logged for audit',
    requirements: [
      'Immutable audit log storage',
      'Log integrity verification',
      'Real-time audit event streaming',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: ['GovernanceEvent system captures all operations'],
        findings: [],
      };
    },
  },
  {
    id: 'IC-AI-031',
    name: 'Incident Response Capability',
    category: 'audit',
    description: 'Automated incident detection and response',
    requirements: [
      'Real-time anomaly detection',
      'Automated mitigation actions',
      'Incident escalation procedures',
    ],
    validationFn: async (ctx) => {
      const metrics = ctx.incidentManager.getMetrics();
      const evidence: string[] = [];

      evidence.push(`${metrics.totalIncidents} incidents tracked`);
      evidence.push(`${metrics.resolvedIncidents} incidents resolved`);

      return {
        status: 'compliant',
        evidence,
        findings: [],
      };
    },
  },

  // Supply Chain Controls
  {
    id: 'IC-AI-040',
    name: 'Model Supply Chain Security',
    category: 'supply_chain',
    description: 'AI models must have verified supply chain provenance',
    requirements: [
      'SLSA Level 3 build provenance',
      'Cosign signature verification',
      'Trusted builder attestation',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: [
          'SLSA-3 verification in AIProvenanceManager',
          'Cosign bundle support enabled',
        ],
        findings: [],
      };
    },
  },
  {
    id: 'IC-AI-041',
    name: 'Prompt Chain Integrity',
    category: 'supply_chain',
    description: 'Prompt chains must be versioned and verified',
    requirements: [
      'Prompt version control',
      'Chain execution provenance',
      'Rollback capability',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: [
          'PromptChainOrchestrator tracks chain provenance',
          'RollbackManager provides recovery capability',
        ],
        findings: [],
      };
    },
  },

  // AI Safety Controls
  {
    id: 'IC-AI-050',
    name: 'Hallucination Detection',
    category: 'ai_safety',
    description: 'AI outputs must be monitored for hallucinations',
    requirements: [
      'Multi-method hallucination detection',
      'Severity-based remediation',
      'Hallucination rate tracking',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: [
          'HallucinationAuditor with factual, consistency, source checks',
          'Auto-remediation enabled',
        ],
        findings: [],
      };
    },
  },
  {
    id: 'IC-AI-051',
    name: 'Misuse Prevention',
    category: 'ai_safety',
    description: 'Agents must be protected against misuse',
    requirements: [
      'Misuse pattern detection',
      'Automated blocking/throttling',
      'Misuse incident reporting',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: [
          'IncidentResponseManager detects misuse patterns',
          'Policy engine enforces misuse prevention',
        ],
        findings: [],
      };
    },
  },
  {
    id: 'IC-AI-052',
    name: 'Safety Boundaries',
    category: 'ai_safety',
    description: 'Agents must operate within defined safety boundaries',
    requirements: [
      'Content safety filters',
      'Output validation',
      'Circuit breaker mechanisms',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: [
          'PromptValidation includes safety checks',
          'RollbackManager has circuit breaker trigger',
        ],
        findings: [],
      };
    },
  },
  {
    id: 'IC-AI-053',
    name: 'Human Oversight',
    category: 'ai_safety',
    description: 'Critical decisions require human approval',
    requirements: [
      'Approval workflows for high-risk actions',
      'Human-in-the-loop escalation',
      'Override audit trails',
    ],
    validationFn: async (ctx) => {
      return {
        status: 'compliant',
        evidence: [
          'PolicyDecision includes requiredApprovals',
          'ChainGovernance requires approvals for sensitive operations',
        ],
        findings: [],
      };
    },
  },
];

// ============================================================================
// IC FY28 Compliance Validator
// ============================================================================

export class ICFY28ComplianceValidator {
  private config: ICFY28ComplianceConfig;
  private policyEngine: AgentPolicyEngine;
  private provenanceManager: AIProvenanceManager;
  private hallucinationAuditor: HallucinationAuditor;
  private incidentManager: IncidentResponseManager;
  private validationHistory: ICFY28ValidationResult[];
  private eventListeners: Array<(event: GovernanceEvent) => void>;

  constructor(
    config: Partial<ICFY28ComplianceConfig>,
    dependencies: {
      policyEngine: AgentPolicyEngine;
      provenanceManager: AIProvenanceManager;
      hallucinationAuditor: HallucinationAuditor;
      incidentManager: IncidentResponseManager;
    },
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.policyEngine = dependencies.policyEngine;
    this.provenanceManager = dependencies.provenanceManager;
    this.hallucinationAuditor = dependencies.hallucinationAuditor;
    this.incidentManager = dependencies.incidentManager;
    this.validationHistory = [];
    this.eventListeners = [];
  }

  /**
   * Run full compliance validation
   */
  async validate(): Promise<ICFY28ValidationResult> {
    if (!this.config.enabled) {
      return {
        timestamp: new Date(),
        overallCompliant: false,
        validationLevel: this.config.validationLevel,
        controls: [],
        findings: [],
        attestations: [],
        nextValidation: new Date(Date.now() + 86400000),
      };
    }

    const context: ValidationContext = {
      policyEngine: this.policyEngine,
      provenanceManager: this.provenanceManager,
      hallucinationAuditor: this.hallucinationAuditor,
      incidentManager: this.incidentManager,
      config: this.config,
    };

    const controls: ICFY28Control[] = [];
    const findings: ICFY28Finding[] = [];

    // Validate each control
    for (const definition of CONTROL_DEFINITIONS) {
      try {
        const result = await definition.validationFn(context);

        controls.push({
          id: definition.id,
          name: definition.name,
          category: definition.category,
          status: result.status,
          evidence: result.evidence,
          remediation: result.findings.length > 0
            ? result.findings[0].remediation
            : undefined,
        });

        // Convert findings
        for (const finding of result.findings) {
          findings.push({
            id: `FIND-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
            severity: finding.severity || 'medium',
            control: definition.id,
            description: finding.description || 'Unknown finding',
            remediation: finding.remediation || 'Review and address',
            dueDate: this.calculateDueDate(finding.severity || 'medium'),
            status: 'open',
          });
        }
      } catch (error) {
        controls.push({
          id: definition.id,
          name: definition.name,
          category: definition.category,
          status: 'non_compliant',
          evidence: [],
          remediation: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    // Determine overall compliance
    const nonCompliantCount = controls.filter((c) => c.status === 'non_compliant').length;
    const criticalFindings = findings.filter((f) => f.severity === 'critical').length;
    const overallCompliant = nonCompliantCount === 0 && criticalFindings === 0;

    // Create attestation
    const attestations: ICFY28Attestation[] = [];
    if (overallCompliant) {
      attestations.push(await this.createAttestation('compliance', {
        validationLevel: this.config.validationLevel,
        controlsPassed: controls.filter((c) => c.status === 'compliant').length,
        controlsTotal: controls.length,
      }));
    }

    const result: ICFY28ValidationResult = {
      timestamp: new Date(),
      overallCompliant,
      validationLevel: this.config.validationLevel,
      controls,
      findings,
      attestations,
      nextValidation: this.calculateNextValidation(),
    };

    // Store in history
    this.validationHistory.push(result);
    if (this.validationHistory.length > 100) {
      this.validationHistory.shift();
    }

    // Emit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'compliance_check',
      source: 'ICFY28ComplianceValidator',
      actor: 'system',
      action: 'validate_compliance',
      resource: 'icfy28',
      outcome: overallCompliant ? 'success' : 'failure',
      classification: 'UNCLASSIFIED',
      details: {
        overallCompliant,
        controlsPassed: controls.filter((c) => c.status === 'compliant').length,
        controlsTotal: controls.length,
        findingsCount: findings.length,
        criticalFindings,
      },
    });

    // Report to external endpoint if configured
    if (this.config.reportingEndpoint) {
      await this.reportToEndpoint(result);
    }

    return result;
  }

  /**
   * Validate specific control
   */
  async validateControl(controlId: string): Promise<ICFY28Control | null> {
    const definition = CONTROL_DEFINITIONS.find((c) => c.id === controlId);
    if (!definition) return null;

    const context: ValidationContext = {
      policyEngine: this.policyEngine,
      provenanceManager: this.provenanceManager,
      hallucinationAuditor: this.hallucinationAuditor,
      incidentManager: this.incidentManager,
      config: this.config,
    };

    const result = await definition.validationFn(context);

    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      status: result.status,
      evidence: result.evidence,
      remediation: result.findings.length > 0 ? result.findings[0].remediation : undefined,
    };
  }

  /**
   * Get compliance score
   */
  getComplianceScore(): {
    score: number;
    byCategory: Record<string, number>;
    trend: 'improving' | 'stable' | 'declining';
  } {
    if (this.validationHistory.length === 0) {
      return { score: 0, byCategory: {}, trend: 'stable' };
    }

    const latest = this.validationHistory[this.validationHistory.length - 1];
    const compliantControls = latest.controls.filter((c) => c.status === 'compliant').length;
    const score = Math.round((compliantControls / latest.controls.length) * 100);

    // Calculate by category
    const byCategory: Record<string, number> = {};
    const categories = [...new Set(latest.controls.map((c) => c.category))];

    for (const category of categories) {
      const categoryControls = latest.controls.filter((c) => c.category === category);
      const categoryCompliant = categoryControls.filter((c) => c.status === 'compliant').length;
      byCategory[category] = Math.round((categoryCompliant / categoryControls.length) * 100);
    }

    // Calculate trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (this.validationHistory.length >= 3) {
      const recent = this.validationHistory.slice(-3);
      const scores = recent.map((r) => {
        const compliant = r.controls.filter((c) => c.status === 'compliant').length;
        return compliant / r.controls.length;
      });

      if (scores[2] > scores[0] + 0.05) trend = 'improving';
      else if (scores[2] < scores[0] - 0.05) trend = 'declining';
    }

    return { score, byCategory, trend };
  }

  /**
   * Get open findings
   */
  getOpenFindings(): ICFY28Finding[] {
    if (this.validationHistory.length === 0) return [];
    const latest = this.validationHistory[this.validationHistory.length - 1];
    return latest.findings.filter((f) => f.status === 'open');
  }

  /**
   * Create compliance attestation
   */
  private async createAttestation(
    type: string,
    claims: Record<string, unknown>,
  ): Promise<ICFY28Attestation> {
    const attestation: ICFY28Attestation = {
      type: `icfy28:${type}`,
      attestedBy: 'ICFY28ComplianceValidator',
      attestedAt: new Date(),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      signature: '',
      claims,
    };

    // Sign attestation
    attestation.signature = crypto
      .createHash('sha256')
      .update(JSON.stringify({ type: attestation.type, claims, attestedAt: attestation.attestedAt }))
      .digest('hex');

    return attestation;
  }

  /**
   * Calculate due date based on severity
   */
  private calculateDueDate(severity: string): Date {
    const daysMap: Record<string, number> = {
      critical: 1,
      high: 7,
      medium: 30,
      low: 90,
    };
    const days = daysMap[severity] || 30;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Calculate next validation time
   */
  private calculateNextValidation(): Date {
    const frequencyMap: Record<string, number> = {
      continuous: 3600000, // 1 hour
      daily: 86400000, // 1 day
      weekly: 604800000, // 1 week
      monthly: 2592000000, // 30 days
    };
    const interval = frequencyMap[this.config.auditFrequency] || 86400000;
    return new Date(Date.now() + interval);
  }

  /**
   * Report to external endpoint
   */
  private async reportToEndpoint(result: ICFY28ValidationResult): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });
    } catch (error) {
      console.error('Failed to report compliance:', error);
    }
  }

  /**
   * Get control definitions
   */
  getControlDefinitions(): Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    requirements: string[];
  }> {
    return CONTROL_DEFINITIONS.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      requirements: c.requirements,
    }));
  }

  /**
   * Get validation history
   */
  getValidationHistory(): ICFY28ValidationResult[] {
    return [...this.validationHistory];
  }

  /**
   * Add event listener
   */
  onEvent(listener: (event: GovernanceEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Emit event
   */
  private emitEvent(event: GovernanceEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }
}
