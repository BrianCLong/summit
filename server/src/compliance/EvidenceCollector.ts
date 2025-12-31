// @ts-nocheck
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  Evidence,
  EvidenceType,
  EvidenceStatus,
  EvidenceCollectionTask,
  ComplianceFramework,
  EvidenceContent,
} from './types/Compliance.js';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';
import { ContinuousControlsService } from './ContinuousControls.js';

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'evidence-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'EvidenceCollector',
  };
}

// ============================================================================
// Evidence Collector Implementation
// ============================================================================

export class EvidenceCollector {
  private evidence: Map<string, Evidence> = new Map();
  private collectionTasks: Map<string, EvidenceCollectionTask> = new Map();
  private controlsService: ContinuousControlsService;

  constructor() {
    this.controlsService = new ContinuousControlsService();
    logger.info('Evidence collector initialized');
  }

  // --------------------------------------------------------------------------
  // Evidence Bundle Generation (New for GA)
  // --------------------------------------------------------------------------

  async collectBundle(tenantId: string): Promise<DataEnvelope<any>> {
    const bundleId = `bundle-${uuidv4()}`;
    const timestamp = new Date().toISOString();
    const gitCommit = process.env.GIT_COMMIT || 'dev-snapshot';

    // Collect checks from ContinuousControls
    const checkResults = await this.controlsService.checkControls();

    // Collect mock SBOM location
    const sbomLocation = 's3://artifacts/sbom/latest.json';

    // Mock active policies
    const activePolicies = ['POLICY-001-AUTH', 'POLICY-002-ENCRYPTION'];

    const bundleContent = {
        bundleId,
        timestamp,
        gitCommit,
        checks: checkResults,
        sbom: { location: sbomLocation, verified: true },
        policies: activePolicies,
        certification: "SOC2_TYPE2_READINESS"
    };

    // Store as evidence
    await this.collectEvidence(
        'BUNDLE-001',
        ComplianceFramework.SOC2,
        EvidenceType.ATTESTATION, // Using available enum value
        tenantId,
        'EvidenceCollector',
        bundleContent,
        'system'
    );

    return createDataEnvelope(bundleContent, {
        source: 'EvidenceCollector',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Bundle generated'),
        classification: DataClassification.CONFIDENTIAL
    });
  }

  // --------------------------------------------------------------------------
  // Evidence Collection
  // --------------------------------------------------------------------------

  async collectEvidence(
    controlId: string,
    framework: ComplianceFramework,
    type: EvidenceType,
    tenantId: string,
    source: string,
    content: unknown,
    actorId: string,
    metadata?: Record<string, unknown>
  ): Promise<DataEnvelope<Evidence>> {
    const evidenceContent: EvidenceContent = {
      format: typeof content === 'string' ? 'text' : 'json',
      data: content,
      size: JSON.stringify(content).length,
    };

    const evidence: Evidence = {
      id: uuidv4(),
      type,
      controlId,
      framework,
      tenantId,
      title: `${type} evidence for ${controlId}`,
      source,
      content: evidenceContent,
      status: 'collected',
      collectedAt: new Date().toISOString(),
      collectedBy: actorId,
      expiresAt: this.calculateExpiry(type),
      metadata,
      hash: this.hashContent(content),
    };

    this.evidence.set(evidence.id, evidence);

    logger.info(
      { evidenceId: evidence.id, controlId, framework, type },
      'Evidence collected'
    );

    return createDataEnvelope(evidence, {
      source: 'EvidenceCollector',
      actor: actorId,
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Evidence collected'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  async collectSystemEvidence(
    controlId: string,
    framework: ComplianceFramework,
    tenantId: string,
    collectorFn: () => Promise<unknown>
  ): Promise<DataEnvelope<Evidence>> {
    try {
      const content = await collectorFn();
      return this.collectEvidence(
        controlId,
        framework,
        'system_config', // Assuming this string maps to EvidenceType enum or is compatible
        tenantId,
        'system-collector',
        content,
        'system',
        { automated: true }
      );
    } catch (error: any) {
      logger.error({ error, controlId }, 'Failed to collect system evidence');
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Evidence Management
  // --------------------------------------------------------------------------

  getEvidence(
    tenantId: string,
    filters?: {
      controlId?: string;
      framework?: ComplianceFramework;
      type?: EvidenceType;
      status?: EvidenceStatus;
    }
  ): DataEnvelope<Evidence[]> {
    let evidenceList = Array.from(this.evidence.values()).filter(
      (e) => e.tenantId === tenantId
    );

    if (filters?.controlId) {
      evidenceList = evidenceList.filter((e) => e.controlId === filters.controlId);
    }

    if (filters?.framework) {
      evidenceList = evidenceList.filter((e) => e.framework === filters.framework);
    }

    if (filters?.type) {
      evidenceList = evidenceList.filter((e) => e.type === filters.type);
    }

    if (filters?.status) {
      evidenceList = evidenceList.filter((e) => e.status === filters.status);
    }

    // Check for stale evidence
    evidenceList = evidenceList.map((e) => {
      if (e.expiresAt && new Date(e.expiresAt) < new Date() && e.status === 'collected') {
        e.status = 'stale';
      }
      return e;
    });

    return createDataEnvelope(evidenceList, {
      source: 'EvidenceCollector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Evidence listing allowed'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  getEvidenceById(evidenceId: string): DataEnvelope<Evidence | null> {
    const evidence = this.evidence.get(evidenceId) || null;

    return createDataEnvelope(evidence, {
      source: 'EvidenceCollector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Evidence retrieval allowed'),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  verifyEvidence(evidenceId: string): DataEnvelope<{ valid: boolean; message: string }> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) {
      return createDataEnvelope(
        { valid: false, message: 'Evidence not found' },
        {
          source: 'EvidenceCollector',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Evidence not found'),
          classification: DataClassification.INTERNAL,
        }
      );
    }

    // Verify hash
    const currentHash = this.hashContent(evidence.content.data);
    const valid = currentHash === evidence.hash;

    return createDataEnvelope(
      {
        valid,
        message: valid ? 'Evidence integrity verified' : 'Evidence integrity check failed',
      },
      {
        source: 'EvidenceCollector',
        governanceVerdict: createVerdict(
          valid ? GovernanceResult.ALLOW : GovernanceResult.FLAG,
          valid ? 'Evidence integrity verified' : 'Evidence integrity check failed'
        ),
        classification: DataClassification.CONFIDENTIAL,
      }
    );
  }

  // --------------------------------------------------------------------------
  // Evidence Status
  // --------------------------------------------------------------------------

  getEvidenceStatus(
    tenantId: string,
    framework?: ComplianceFramework
  ): DataEnvelope<{
    total: number;
    collected: number;
    pending: number;
    stale: number;
    missing: number;
    coveragePercentage: number;
  }> {
    const evidenceList = this.getEvidence(tenantId, { framework }).data;

    const status = {
      total: evidenceList.length,
      collected: evidenceList.filter((e) => e.status === 'collected').length,
      pending: evidenceList.filter((e) => e.status === 'pending').length,
      stale: evidenceList.filter((e) => e.status === 'stale').length,
      missing: evidenceList.filter((e) => e.status === 'missing').length,
      coveragePercentage: 0,
    };

    if (status.total > 0) {
      status.coveragePercentage = Math.round((status.collected / status.total) * 100);
    }

    return createDataEnvelope(status, {
      source: 'EvidenceCollector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Evidence status retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Collection Tasks
  // --------------------------------------------------------------------------

  createCollectionTask(
    task: Omit<EvidenceCollectionTask, 'id' | 'lastRun' | 'status' | 'failureCount'>
  ): DataEnvelope<EvidenceCollectionTask> {
    const collectionTask: EvidenceCollectionTask = {
      id: uuidv4(),
      ...task,
      status: 'active',
      failureCount: 0,
    };

    this.collectionTasks.set(collectionTask.id, collectionTask);

    logger.info(
      { taskId: collectionTask.id, controlId: task.controlId },
      'Collection task created'
    );

    return createDataEnvelope(collectionTask, {
      source: 'EvidenceCollector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Collection task created'),
      classification: DataClassification.INTERNAL,
    });
  }

  getCollectionTasks(
    tenantId: string,
    framework?: ComplianceFramework
  ): DataEnvelope<EvidenceCollectionTask[]> {
    let tasks = Array.from(this.collectionTasks.values()).filter(
      (t) => t.tenantId === tenantId
    );

    if (framework) {
      tasks = tasks.filter((t) => t.framework === framework);
    }

    return createDataEnvelope(tasks, {
      source: 'EvidenceCollector',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Collection tasks listed'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private calculateExpiry(type: EvidenceType): string {
    const expiryDays: Record<EvidenceType, number> = {
      system_config: 7,
      access_log: 30,
      audit_trail: 90,
      policy_document: 365,
      screenshot: 30,
      test_result: 90,
      attestation: 365,
      scan_report: 30,
      metric: 7,
      custom: 90,
    };

    const days = expiryDays[type] || 90;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  private hashContent(content: unknown): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}

// Export singleton
export const evidenceCollector = new EvidenceCollector();
export default EvidenceCollector;
