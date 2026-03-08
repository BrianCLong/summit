"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForensicsCustodySystem = exports.InMemoryForensicsRepository = exports.InMemoryCustodyLedger = void 0;
// @ts-nocheck
const crypto_1 = require("crypto");
class InMemoryCustodyLedger {
    events = new Map();
    async append(event) {
        const existing = this.events.get(event.evidenceId) ?? [];
        existing.push(event);
        this.events.set(event.evidenceId, existing);
    }
    async list(evidenceId) {
        return [...(this.events.get(evidenceId) ?? [])];
    }
}
exports.InMemoryCustodyLedger = InMemoryCustodyLedger;
class InMemoryForensicsRepository {
    evidence = new Map();
    accessLogs = [];
    verifications = [];
    legalHolds = [];
    async saveEvidence(record) {
        this.evidence.set(record.id, record);
    }
    async getEvidence(id) {
        return this.evidence.get(id) ?? null;
    }
    async listEvidence() {
        return [...this.evidence.values()];
    }
    async recordAccess(entry) {
        this.accessLogs.push(entry);
    }
    async listAccessLogs(evidenceId) {
        if (!evidenceId)
            return [...this.accessLogs];
        return this.accessLogs.filter((log) => log.evidenceId === evidenceId);
    }
    async recordVerification(result) {
        this.verifications.push(result);
    }
    async listVerifications(evidenceId) {
        if (!evidenceId)
            return [...this.verifications];
        return this.verifications.filter((entry) => entry.evidenceId === evidenceId);
    }
    async recordLegalHold(record) {
        this.legalHolds.push(record);
    }
    async listLegalHolds(evidenceId) {
        if (!evidenceId)
            return [...this.legalHolds];
        return this.legalHolds.filter((hold) => hold.evidenceId === evidenceId);
    }
}
exports.InMemoryForensicsRepository = InMemoryForensicsRepository;
class ForensicsCustodySystem {
    repository;
    ledger;
    signer;
    legalHoldAdapter;
    now;
    constructor(options) {
        this.repository = options.repository;
        this.ledger = options.ledger;
        this.signer = options.signer;
        this.legalHoldAdapter = options.legalHoldAdapter;
        this.now = options.now ?? (() => new Date());
    }
    async registerEvidence(input) {
        const existing = await this.repository.getEvidence(input.id);
        if (existing) {
            throw new Error(`Evidence ${input.id} already exists`);
        }
        const hashAlgorithm = input.hashAlgorithm ?? 'sha256';
        const hash = this.computeHash(input.content, hashAlgorithm);
        const record = {
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
    async verifyEvidenceIntegrity(evidenceId, content) {
        const evidence = await this.getEvidenceOrThrow(evidenceId);
        const observedHash = this.computeHash(content, evidence.hashAlgorithm);
        const verified = observedHash === evidence.hash;
        const result = {
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
    async logAccess(entry) {
        const evidence = await this.getEvidenceOrThrow(entry.evidenceId, entry.caseId);
        const logEntry = {
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
    async placeLegalHold(request) {
        const evidence = await this.getEvidenceOrThrow(request.evidenceId, request.caseId);
        if (!request.scope.length) {
            throw new Error('Legal hold scope must include at least one target');
        }
        const createdAt = this.now();
        const holdRecord = this.legalHoldAdapter
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
    async verifyCustodyChain(evidenceId) {
        const events = await this.ledger.list(evidenceId);
        if (!events.length)
            return false;
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
            const hash = (0, crypto_1.createHash)('sha256')
                .update(prevHash + JSON.stringify(payload))
                .digest('hex');
            if (hash !== event.eventHash)
                return false;
            const ok = (0, crypto_1.verify)(null, Buffer.from(event.eventHash), this.signer.publicKey, Buffer.from(event.signature, 'base64'));
            if (!ok)
                return false;
            prevHash = event.eventHash;
        }
        return true;
    }
    async generateComplianceReport() {
        const [evidence, accessLogs, verifications, legalHolds] = await Promise.all([
            this.repository.listEvidence(),
            this.repository.listAccessLogs(),
            this.repository.listVerifications(),
            this.repository.listLegalHolds(),
        ]);
        const chainBreakdown = [];
        let verifiedChains = 0;
        for (const record of evidence) {
            const verified = await this.verifyCustodyChain(record.id);
            const events = await this.ledger.list(record.id);
            chainBreakdown.push({
                evidenceId: record.id,
                verified,
                eventCount: events.length,
            });
            if (verified)
                verifiedChains += 1;
        }
        const lastVerification = verifications.reduce((latest, current) => {
            if (!latest || current.checkedAt > latest)
                return current.checkedAt;
            return latest;
        }, null);
        const justifiedAccessCount = accessLogs.filter((log) => !!log.legalBasis && !!log.reason).length;
        const verifiedEvidence = new Set(verifications.filter((v) => v.verified).map((v) => v.evidenceId));
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
    async appendCustodyEvent(event) {
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
        const eventHash = (0, crypto_1.createHash)('sha256')
            .update(prevHash + JSON.stringify(payload))
            .digest('hex');
        const signature = (0, crypto_1.sign)(null, Buffer.from(eventHash), this.signer.privateKey).toString('base64');
        const record = {
            ...event,
            at,
            prevHash,
            eventHash,
            signature,
        };
        await this.ledger.append(record);
    }
    computeHash(value, algorithm) {
        return (0, crypto_1.createHash)(algorithm).update(value).digest('hex');
    }
    async getEvidenceOrThrow(evidenceId, expectedCaseId) {
        const evidence = await this.repository.getEvidence(evidenceId);
        if (!evidence) {
            throw new Error(`Evidence ${evidenceId} not found`);
        }
        if (expectedCaseId && evidence.caseId !== expectedCaseId) {
            throw new Error(`Case mismatch for evidence ${evidenceId}: expected ${expectedCaseId}, found ${evidence.caseId}`);
        }
        return evidence;
    }
}
exports.ForensicsCustodySystem = ForensicsCustodySystem;
