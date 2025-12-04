import { CertificationWorkflow } from './certification.js';
import { AppendOnlyAuditLog } from './audit.js';
import { QuarantineService } from './quarantine.js';
import { ScorecardEngine } from './scorecard.js';
import { validateConformance, diffSpecs } from './spec-utils.js';
import {
  Certification,
  ConformanceResult,
  ContractSpec,
  QuarantineRecord,
  Scorecard,
} from './types.js';

export interface IngestionOutcome {
  status: 'accepted' | 'rejected' | 'quarantined';
  reason?: string;
  conformance: ConformanceResult;
  certificateVerified: boolean;
  quarantineRecord?: QuarantineRecord;
}

export class ContractRegistry {
  private readonly specs = new Map<string, ContractSpec>();
  private readonly certificates = new Map<string, Certification>();
  private readonly scorecards = new Map<string, Scorecard>();

  constructor(
    private readonly workflow: CertificationWorkflow,
    private readonly audit: AppendOnlyAuditLog,
    private readonly quarantine: QuarantineService,
    private readonly scorecardsEngine: ScorecardEngine,
  ) {}

  register(spec: ContractSpec): void {
    const record: ContractSpec = {
      ...spec,
      createdAt: spec.createdAt ?? new Date().toISOString(),
      status: spec.status ?? 'draft',
    };
    this.specs.set(spec.id, record);
    this.audit.record({ actor: 'registry', action: 'registered', details: { id: spec.id, version: spec.version } });
  }

  update(spec: ContractSpec): string[] {
    const previous = this.specs.get(spec.id);
    this.register(spec);
    if (!previous) return ['new spec registered'];
    const drift = diffSpecs(previous, spec);
    if (drift.length > 0) {
      this.audit.record({ actor: 'registry', action: 'drift-detected', details: { id: spec.id, drift } });
    }
    return drift;
  }

  get(contractId: string): ContractSpec | undefined {
    return this.specs.get(contractId);
  }

  async certify(contractId: string, secret: string, validUntil?: string): Promise<Certification | undefined> {
    const spec = this.get(contractId);
    if (!spec) return undefined;
    const certificate = await this.workflow.issueCertificate(spec, secret, validUntil);
    this.certificates.set(contractId, certificate);
    spec.status = 'certified';
    this.audit.record({ actor: 'registry', action: 'certified', details: { id: contractId, certificateId: certificate.id } });
    return certificate;
  }

  getCertificate(contractId: string): Certification | undefined {
    return this.certificates.get(contractId);
  }

  async validateIngestion(
    contractId: string,
    payload: Record<string, unknown>,
    environment: 'dev' | 'staging' | 'production',
    secret: string,
    providedCertificate?: Certification,
  ): Promise<IngestionOutcome> {
    const spec = this.get(contractId);
    if (!spec) {
      return {
        status: 'rejected',
        reason: `Unknown contract ${contractId}`,
        conformance: {
          conforms: false,
          missingFields: [],
          nullabilityViolations: [],
          typeViolations: [],
          score: 0,
          piiFlagsValid: false,
          dpFlagsValid: false,
        },
        certificateVerified: false,
      };
    }

    const conformance = validateConformance(spec, payload);
    const certificate = providedCertificate ?? this.getCertificate(contractId);
    const verification = certificate
      ? await this.workflow.verifyCertificate(spec, certificate, secret)
      : { certificate: undefined, verified: false };

    if (environment === 'production' && !verification.verified) {
      this.audit.record({ actor: 'ingestion', action: 'blocked-no-cert', details: { contractId } });
      return {
        status: 'rejected',
        reason: 'Production ingestion requires a verified certificate',
        conformance,
        certificateVerified: false,
      };
    }

    if (!conformance.conforms) {
      const quarantineRecord = this.quarantine.place(contractId, 'contract-nonconformance', payload);
      this.audit.record({ actor: 'ingestion', action: 'quarantined', details: { contractId, issues: conformance } });
      return {
        status: 'quarantined',
        reason: 'Payload did not conform to contract',
        conformance,
        certificateVerified: verification.verified,
        quarantineRecord,
      };
    }

    this.audit.record({ actor: 'ingestion', action: 'accepted', details: { contractId, environment } });
    this.scorecards.set(
      contractId,
      this.scorecardsEngine.build({
        contractId,
        version: spec.version,
        conformanceScores: [conformance.score],
        quarantinedEvents: 0,
      }),
    );

    return {
      status: 'accepted',
      conformance,
      certificateVerified: verification.verified,
    };
  }

  recertifyAfterResolution(contractId: string, secret: string): Promise<Certification | undefined> {
    const spec = this.get(contractId);
    if (!spec) return Promise.resolve(undefined);
    spec.status = 'certified';
    return this.certify(contractId, secret);
  }

  getScorecard(contractId: string): Scorecard | undefined {
    return this.scorecards.get(contractId);
  }
}
