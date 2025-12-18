import { createHash, randomUUID } from 'node:crypto';
import type { EvidenceBundle } from 'common-types';
import type { ExportManifest } from './manifest.js';
import { verifyManifest } from './manifest.js';

export type ValidationStatus = 'verified' | 'rejected' | 'error';

export interface ExternalValidationPayload {
  bundleHash: string;
  evidenceCount: number;
  manifest: ExportManifest;
}

export interface ExternalVerificationReceipt {
  validator: string;
  status: ValidationStatus;
  correlationId: string;
  checkedAt: string;
  notes?: string;
}

export interface ComplianceAttestation {
  framework: string;
  attestedBy: string;
  status: 'compliant' | 'non-compliant' | 'unverified';
  issuedAt: string;
  evidenceRef: string;
  controlsTested: string[];
  notes?: string;
}

export type CustodyStage = 'received' | 'submitted' | 'verified' | 'attested';

export interface ChainOfCustodyEvent {
  stage: CustodyStage;
  actor: string;
  timestamp: string;
  location?: string;
  notes?: string;
}

export interface ThirdPartyValidator {
  name: string;
  verify(payload: ExternalValidationPayload): Promise<ExternalVerificationReceipt>;
}

export interface ValidatorOptions {
  complianceFramework?: string;
  attestor?: string;
  custodyLocation?: string;
  now?: () => Date;
}

export interface ExternalValidationReport {
  manifestVerification: ReturnType<typeof verifyManifest>;
  thirdParty: ExternalVerificationReceipt;
  compliance: ComplianceAttestation;
  custodyTrail: ChainOfCustodyEvent[];
}

export class ProvenanceBundleValidator {
  private readonly now: () => Date;
  private readonly complianceFramework: string;
  private readonly attestor: string;
  private readonly custodyLocation?: string;

  constructor(
    private readonly validator: ThirdPartyValidator,
    options: ValidatorOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.complianceFramework = options.complianceFramework ?? 'SOC2';
    this.attestor = options.attestor ?? validator.name;
    this.custodyLocation = options.custodyLocation;
  }

  async validate(
    bundle: EvidenceBundle,
    manifest: ExportManifest,
  ): Promise<ExternalValidationReport> {
    const custodyTrail: ChainOfCustodyEvent[] = [
      this.buildCustodyEvent('received', 'prov-ledger'),
    ];

    const manifestVerification = verifyManifest(manifest, bundle.entries, bundle);

    const payload: ExternalValidationPayload = {
      bundleHash: hashBundle(bundle),
      evidenceCount: bundle.entries.length,
      manifest,
    };

    custodyTrail.push(
      this.buildCustodyEvent('submitted', this.validator.name, 'Submitted for independent verification'),
    );

    const thirdParty = await this.safeVerify(payload);

    custodyTrail.push(
      this.buildCustodyEvent('verified', this.validator.name, `status=${thirdParty.status}`),
    );

    const compliance = this.buildComplianceAttestation(
      payload.bundleHash,
      manifestVerification.valid && thirdParty.status === 'verified',
      thirdParty.notes,
    );

    custodyTrail.push(
      this.buildCustodyEvent('attested', compliance.attestedBy, compliance.status),
    );

    return { manifestVerification, thirdParty, compliance, custodyTrail };
  }

  private buildComplianceAttestation(
    evidenceRef: string,
    success: boolean,
    notes?: string,
  ): ComplianceAttestation {
    return {
      framework: this.complianceFramework,
      attestedBy: this.attestor,
      status: success ? 'compliant' : 'non-compliant',
      issuedAt: this.now().toISOString(),
      evidenceRef,
      controlsTested: ['integrity', 'traceability', 'immutability'],
      notes,
    };
  }

  private buildCustodyEvent(
    stage: CustodyStage,
    actor: string,
    notes?: string,
  ): ChainOfCustodyEvent {
    return {
      stage,
      actor,
      timestamp: this.now().toISOString(),
      location: this.custodyLocation,
      notes,
    };
  }

  private async safeVerify(
    payload: ExternalValidationPayload,
  ): Promise<ExternalVerificationReceipt> {
    try {
      return await this.validator.verify(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown validator failure';
      return {
        validator: this.validator.name,
        status: 'error',
        correlationId: randomUUID(),
        checkedAt: this.now().toISOString(),
        notes: message,
      };
    }
  }
}

export function hashBundle(bundle: EvidenceBundle): string {
  const hash = createHash('sha256');
  hash.update(bundle.headHash ?? '');
  hash.update(JSON.stringify(bundle.entries));
  return hash.digest('hex');
}
