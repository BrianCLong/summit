import { createHash, KeyObject, sign, verify } from 'crypto';

export type HashAlgorithm = 'sha256' | 'sha512';

export interface EvidenceRecord {
  id: string;
  caseId: string;
  title: string;
  collectedBy: string;
  collectedAt: Date;
  hash: string;
  hashAlgorithm: HashAlgorithm;
  metadata?: Record<string, any>;
}

export interface CustodyEventInput {
  evidenceId: string;
  caseId: string;
  actorId: string;
  action: string;
  payload?: Record<string, any>;
}

export interface CustodyEventRecord extends CustodyEventInput {
  at: Date;
  prevHash: string;
  eventHash: string;
  signature: string;
}

export interface AccessLogEntry {
  evidenceId: string;
  caseId: string;
  actorId: string;
  reason: string;
  legalBasis: string;
  at: Date;
  context?: Record<string, any>;
}

export interface IntegrityVerificationResult {
  evidenceId: string;
  caseId: string;
  verified: boolean;
  expectedHash: string;
  observedHash: string;
  hashAlgorithm: HashAlgorithm;
  checkedAt: Date;
  notes?: string;
}

export interface LegalHoldRequest {
  evidenceId: string;
  caseId: string;
  holdName: string;
  reason: string;
  scope: string[];
  requestedBy: string;
}

export interface LegalHoldRecord extends LegalHoldRequest {
  holdId: string;
  status: 'active' | 'released' | 'failed';
  createdAt: Date;
  details?: string;
}

export interface ChainVerificationSummary {
  evidenceId: string;
  verified: boolean;
  eventCount: number;
}

export interface ComplianceReport {
  generatedAt: Date;
  soc2: {
    integrity: {
      verified: number;
      total: number;
      lastVerification: Date | null;
    };
    accessControls: {
      totalEvents: number;
      justifiedEvents: number;
    };
  };
  gdpr: {
    legalHolds: {
      active: number;
    };
    dataIntegrity: {
      verifiedAssets: number;
      pendingVerification: number;
    };
  };
  chainOfCustody: {
    verifiedChains: number;
    totalChains: number;
    breakdown: ChainVerificationSummary[];
  };
}

export interface CustodyLedger {
  append(event: CustodyEventRecord): Promise<void>;
  list(evidenceId: string): Promise<CustodyEventRecord[]>;
}

export interface ForensicsRepository {
  saveEvidence(record: EvidenceRecord): Promise<void>;
  getEvidence(id: string): Promise<EvidenceRecord | null>;
  listEvidence(): Promise<EvidenceRecord[]>;
  recordAccess(entry: AccessLogEntry): Promise<void>;
  listAccessLogs(evidenceId?: string): Promise<AccessLogEntry[]>;
  recordVerification(result: IntegrityVerificationResult): Promise<void>;
  listVerifications(evidenceId?: string): Promise<IntegrityVerificationResult[]>;
  recordLegalHold(record: LegalHoldRecord): Promise<void>;
  listLegalHolds(evidenceId?: string): Promise<LegalHoldRecord[]>;
}

export interface LegalHoldAdapter {
  initiateHold(request: LegalHoldRequest): Promise<LegalHoldRecord>;
}

export interface ChainSigner {
  privateKey: KeyObject;
  publicKey: KeyObject;
}

export class InMemoryCustodyLedger implements CustodyLedger {
  private readonly events: Map<string, CustodyEventRecord[]> = new Map();

  async append(event: CustodyEventRecord): Promise<void> {
    const existing = this.events.get(event.evidenceId) ?? [];
    existing.push(event);
    this.events.set(event.evidenceId, existing);
  }

  async list(evidenceId: string): Promise<CustodyEventRecord[]> {
    return [...(this.events.get(evidenceId) ?? [])];
  }
}

export class InMemoryForensicsRepository implements ForensicsRepository {
  private readonly evidence = new Map<string, EvidenceRecord>();
  private readonly accessLogs: AccessLogEntry[] = [];
  private readonly verifications: IntegrityVerificationResult[] = [];
  private readonly legalHolds: LegalHoldRecord[] = [];

  async saveEvidence(record: EvidenceRecord): Promise<void> {
    this.evidence.set(record.id, record);
  }

  async getEvidence(id: string): Promise<EvidenceRecord | null> {
    return this.evidence.get(id) ?? null;
  }

  async listEvidence(): Promise<EvidenceRecord[]> {
    return [...this.evidence.values()];
  }

  async recordAccess(entry: AccessLogEntry): Promise<void> {
    this.accessLogs.push(entry);
  }

  async listAccessLogs(evidenceId?: string): Promise<AccessLogEntry[]> {
    if (!evidenceId) return [...this.accessLogs];
    return this.accessLogs.filter((log) => log.evidenceId === evidenceId);
  }

  async recordVerification(result: IntegrityVerificationResult): Promise<void> {
    this.verifications.push(result);
  }

  async listVerifications(
    evidenceId?: string,
  ): Promise<IntegrityVerificationResult[]> {
    if (!evidenceId) return [...this.verifications];
    return this.verifications.filter((entry) => entry.evidenceId === evidenceId);
  }

  async recordLegalHold(record: LegalHoldRecord): Promise<void> {
    this.legalHolds.push(record);
  }

  async listLegalHolds(evidenceId?: string): Promise<LegalHoldRecord[]> {
    if (!evidenceId) return [...this.legalHolds];
    return this.legalHolds.filter((hold) => hold.evidenceId === evidenceId);
  }
}

export class ForensicsCustodySystem {
  private readonly repository: ForensicsRepository;
  private readonly ledger: CustodyLedger;
  private readonly signer: ChainSigner;
  private readonly legalHoldAdapter?: LegalHoldAdapter;
  private readonly now: () => Date;

  constructor(options: {
    repository: ForensicsRepository;
    ledger: CustodyLedger;
    signer: ChainSigner;
    legalHoldAdapter?: LegalHoldAdapter;
    now?: () => Date;
  }) {
    this.repository = options.repository;
    this.ledger = options.ledger;
    this.signer = options.signer;
    this.legalHoldAdapter = options.legalHoldAdapter;
    this.now = options.now ?? (() => new Date());
  }

  async registerEvidence(input: {
    id: string;
    caseId: string;
    title: string;
    collectedBy: string;
    content: Buffer | string;
    hashAlgorithm?: HashAlgorithm;
    metadata?: Record<string, any>;
  }): Promise<EvidenceRecord> {
    const existing = await this.repository.getEvidence(input.id);
    if (existing) {
      throw new Error(`Evidence ${input.id} already exists`);
    }

    const hashAlgorithm = input.hashAlgorithm ?? 'sha256';
    const hash = this.computeHash(input.content, hashAlgorithm);
    const record: EvidenceRecord = {
      id: input.id,
      caseId: input.caseId,
      title: input.title,
      collectedBy: input.collectedBy,
      collectedAt: this.now(),
      hash,
      hashAlgorithm,
      metadata: input.metadata,
    };

    await this.repository.saveEvidence(record);
    await this.appendCustodyEvent({
      evidenceId: record.id,
      caseId: record.caseId,
      actorId: record.collectedBy,
      action: 'EVIDENCE_REGISTERED',
      payload: {
        title: record.title,
        hash,
        hashAlgorithm,
      },
    });
    await this.repository.recordVerification({
      evidenceId: record.id,
      caseId: record.caseId,
      verified: true,
      expectedHash: hash,
      observedHash: hash,
      hashAlgorithm,
      checkedAt: this.now(),
      notes: 'Initial ingestion verification',
    });
    return record;
  }

  async verifyEvidenceIntegrity(
    evidenceId: string,
    content: Buffer | string,
  ): Promise<IntegrityVerificationResult> {
    const evidence = await this.getEvidenceOrThrow(evidenceId);
    const observedHash = this.computeHash(content, evidence.hashAlgorithm);
    const verified = observedHash === evidence.hash;
    const result: IntegrityVerificationResult = {
      evidenceId,
      caseId: evidence.caseId,
      verified,
      expectedHash: evidence.hash,
      observedHash,
      hashAlgorithm: evidence.hashAlgorithm,
      checkedAt: this.now(),
      notes: verified
        ? 'Hash matches recorded integrity baseline'
        : 'Hash mismatch detected during verification',
    };
    await this.repository.recordVerification(result);
    await this.appendCustodyEvent({
      evidenceId,
      caseId: evidence.caseId,
      actorId: 'system',
      action: 'INTEGRITY_VERIFIED',
      payload: { verified, observedHash },
    });
    return result;
  }

  async logAccess(entry: {
    evidenceId: string;
    caseId: string;
    actorId: string;
    reason: string;
    legalBasis: string;
    context?: Record<string, any>;
  }): Promise<AccessLogEntry> {
    const evidence = await this.getEvidenceOrThrow(entry.evidenceId, entry.caseId);
    const logEntry: AccessLogEntry = {
      ...entry,
      caseId: evidence.caseId,
      at: this.now(),
    };
    await this.repository.recordAccess(logEntry);
    await this.appendCustodyEvent({
      evidenceId: entry.evidenceId,
      caseId: evidence.caseId,
      actorId: entry.actorId,
      action: 'EVIDENCE_ACCESSED',
      payload: {
        reason: entry.reason,
        legalBasis: entry.legalBasis,
      },
    });
    return logEntry;
  }

  async placeLegalHold(request: LegalHoldRequest): Promise<LegalHoldRecord> {
    const evidence = await this.getEvidenceOrThrow(request.evidenceId, request.caseId);
    if (!request.scope.length) {
      throw new Error('Legal hold scope must include at least one target');
    }
    const createdAt = this.now();
    const holdRecord: LegalHoldRecord = this.legalHoldAdapter
      ? await this.legalHoldAdapter.initiateHold(request)
      : {
          ...request,
          caseId: evidence.caseId,
          holdId: `hold-${request.evidenceId}-${createdAt.getTime()}`,
          status: 'active',
          createdAt,
          details: 'Recorded locally; no external adapter provided',
        };

    await this.repository.recordLegalHold(holdRecord);
    await this.appendCustodyEvent({
      evidenceId: request.evidenceId,
      caseId: evidence.caseId,
      actorId: request.requestedBy,
      action: 'LEGAL_HOLD_APPLIED',
      payload: {
        holdId: holdRecord.holdId,
        scope: request.scope,
        reason: request.reason,
      },
    });
    return holdRecord;
  }

  async verifyCustodyChain(evidenceId: string): Promise<boolean> {
    const events = await this.ledger.list(evidenceId);
    if (!events.length) return false;
    let prevHash = 'GENESIS';
    for (const event of events) {
      const payload = {
        evidenceId: event.evidenceId,
        caseId: event.caseId,
        actorId: event.actorId,
        action: event.action,
        payload: event.payload,
        at: event.at,
      };
      const hash = createHash('sha256')
        .update(prevHash + JSON.stringify(payload))
        .digest('hex');
      if (hash !== event.eventHash) return false;
      const ok = verify(
        null,
        Buffer.from(event.eventHash),
        this.signer.publicKey,
        Buffer.from(event.signature, 'base64'),
      );
      if (!ok) return false;
      prevHash = event.eventHash;
    }
    return true;
  }

  async generateComplianceReport(): Promise<ComplianceReport> {
    const [evidence, accessLogs, verifications, legalHolds] = await Promise.all([
      this.repository.listEvidence(),
      this.repository.listAccessLogs(),
      this.repository.listVerifications(),
      this.repository.listLegalHolds(),
    ]);

    const chainBreakdown: ChainVerificationSummary[] = [];
    let verifiedChains = 0;
    for (const record of evidence) {
      const verified = await this.verifyCustodyChain(record.id);
      const events = await this.ledger.list(record.id);
      chainBreakdown.push({
        evidenceId: record.id,
        verified,
        eventCount: events.length,
      });
      if (verified) verifiedChains += 1;
    }

    const lastVerification = verifications.reduce<Date | null>((latest, current) => {
      if (!latest || current.checkedAt > latest) return current.checkedAt;
      return latest;
    }, null);

    const justifiedAccessCount = accessLogs.filter(
      (log) => !!log.legalBasis && !!log.reason,
    ).length;

    const verifiedEvidence = new Set(
      verifications.filter((v) => v.verified).map((v) => v.evidenceId),
    );

    return {
      generatedAt: this.now(),
      soc2: {
        integrity: {
          verified: verifiedEvidence.size,
          total: evidence.length,
          lastVerification,
        },
        accessControls: {
          totalEvents: accessLogs.length,
          justifiedEvents: justifiedAccessCount,
        },
      },
      gdpr: {
        legalHolds: {
          active: legalHolds.filter((hold) => hold.status === 'active').length,
        },
        dataIntegrity: {
          verifiedAssets: verifiedEvidence.size,
          pendingVerification: evidence.length - verifiedEvidence.size,
        },
      },
      chainOfCustody: {
        verifiedChains,
        totalChains: evidence.length,
        breakdown: chainBreakdown,
      },
    };
  }

  private async appendCustodyEvent(event: CustodyEventInput): Promise<void> {
    const existing = await this.ledger.list(event.evidenceId);
    const prevHash = existing.length
      ? existing[existing.length - 1].eventHash
      : 'GENESIS';
    const at = this.now();
    const payload = {
      evidenceId: event.evidenceId,
      caseId: event.caseId,
      actorId: event.actorId,
      action: event.action,
      payload: event.payload,
      at,
    };
    const eventHash = createHash('sha256')
      .update(prevHash + JSON.stringify(payload))
      .digest('hex');
    const signature = sign(null, Buffer.from(eventHash), this.signer.privateKey)
      .toString('base64');
    const record: CustodyEventRecord = {
      ...event,
      at,
      prevHash,
      eventHash,
      signature,
    };
    await this.ledger.append(record);
  }

  private computeHash(value: Buffer | string, algorithm: HashAlgorithm): string {
    return createHash(algorithm).update(value).digest('hex');
  }

  private async getEvidenceOrThrow(
    evidenceId: string,
    expectedCaseId?: string,
  ): Promise<EvidenceRecord> {
    const evidence = await this.repository.getEvidence(evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found`);
    }
    if (expectedCaseId && evidence.caseId !== expectedCaseId) {
      throw new Error(
        `Case mismatch for evidence ${evidenceId}: expected ${expectedCaseId}, found ${evidence.caseId}`,
      );
    }
    return evidence;
  }
}
