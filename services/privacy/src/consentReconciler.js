"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsentReconciler = exports.HttpConsentApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const STATUS_PRIORITY = {
    withdrawn: 4,
    denied: 3,
    expired: 2,
    granted: 1,
};
function sortPurposes(values) {
    if (!values?.length)
        return [];
    return Array.from(new Set(values)).sort();
}
function stableSerialize(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableSerialize).join(',')}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableSerialize(v)}`).join(',')}}`;
}
class HttpConsentApiClient {
    client;
    options;
    constructor(options, client) {
        if (!options.baseUrl) {
            throw new Error('HttpConsentApiClient requires a baseUrl');
        }
        this.options = {
            baseUrl: options.baseUrl,
            token: options.token ?? '',
            timeoutMs: options.timeoutMs ?? 5000,
        };
        this.client =
            client ??
                axios_1.default.create({
                    baseURL: this.options.baseUrl,
                    timeout: this.options.timeoutMs,
                    headers: this.options.token
                        ? { Authorization: `Bearer ${this.options.token}` }
                        : undefined,
                });
    }
    async fetchConsent(consentId) {
        try {
            const response = await this.client.get(`/consents/${consentId}`);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    }
    async upsertConsent(consent) {
        await this.client.put(`/consents/${consent.consentId}`, consent);
    }
    async recordAuditTrail(entry) {
        await this.client.post(`/consents/${entry.consentId}/audit`, entry);
    }
    async publishDrift(consentId, findings) {
        if (!findings.length)
            return;
        await this.client.post(`/consents/${consentId}/drift`, { findings });
    }
}
exports.HttpConsentApiClient = HttpConsentApiClient;
class ConsentReconciler {
    api;
    actor;
    clockSkewToleranceMs;
    requireNoticeForCcpa;
    requireProofForGdpr;
    constructor(api, options = {}) {
        this.api = api;
        this.actor = options.actor ?? 'consent-reconciler';
        this.clockSkewToleranceMs = options.clockSkewToleranceMs ?? 5 * 60 * 1000;
        this.requireNoticeForCcpa = options.requireNoticeForCcpa ?? true;
        this.requireProofForGdpr = options.requireProofForGdpr ?? true;
    }
    async reconcile(consentId, snapshots) {
        if (!snapshots.length) {
            throw new Error('No consent snapshots provided for reconciliation');
        }
        const uniqueIds = new Set(snapshots.map((snapshot) => snapshot.consentId));
        if (uniqueIds.size !== 1 || !uniqueIds.has(consentId)) {
            throw new Error('Snapshots must belong to the consentId being reconciled');
        }
        const { canonical, stale } = this.resolveConflicts(snapshots);
        const existing = await this.api.fetchConsent(consentId);
        const nextVersion = existing && existing.version >= canonical.version
            ? existing.version + 1
            : canonical.version;
        const lastSyncedAt = new Date().toISOString();
        const canonicalRecord = {
            ...this.omitSource(canonical),
            canonicalSource: canonical.source,
            sources: snapshots.map((snapshot) => snapshot.source),
            lastSyncedAt,
            version: nextVersion,
            purposes: sortPurposes(canonical.purposes),
        };
        const compliance = this.validateCompliance(canonicalRecord);
        const driftFindings = this.detectDrift(canonicalRecord, snapshots);
        const auditTrail = this.generateAuditTrail(canonicalRecord, stale, compliance, driftFindings);
        await this.api.upsertConsent(canonicalRecord);
        for (const entry of auditTrail) {
            await this.api.recordAuditTrail(entry);
        }
        if (this.api.publishDrift) {
            await this.api.publishDrift(consentId, driftFindings);
        }
        return {
            canonical: canonicalRecord,
            updatesRequired: stale.map((snapshot) => snapshot.source),
            compliance,
            driftFindings,
            auditTrail,
        };
    }
    resolveConflicts(snapshots) {
        const ordered = [...snapshots].sort((a, b) => {
            if (a.version !== b.version) {
                return b.version - a.version;
            }
            const timeDiff = new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
            if (timeDiff !== 0) {
                return timeDiff;
            }
            return STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
        });
        const canonicalBase = ordered[0];
        const merged = this.mergeMetadata(canonicalBase, ordered);
        const stale = ordered
            .slice(1)
            .filter((snapshot) => this.hasMeaningfulDifference(merged, snapshot));
        return { canonical: merged, stale };
    }
    mergeMetadata(canonical, snapshots) {
        const mergedMetadata = {};
        const mergedPreferences = {};
        const mergedPurposes = new Set(canonical.purposes ?? []);
        for (const snapshot of snapshots) {
            if (snapshot.metadata) {
                Object.assign(mergedMetadata, snapshot.metadata);
            }
            if (snapshot.preferences) {
                Object.assign(mergedPreferences, snapshot.preferences);
            }
            for (const purpose of snapshot.purposes ?? []) {
                mergedPurposes.add(purpose);
            }
        }
        return {
            ...canonical,
            metadata: { ...mergedMetadata, ...canonical.metadata },
            preferences: { ...mergedPreferences, ...canonical.preferences },
            purposes: Array.from(mergedPurposes),
        };
    }
    hasMeaningfulDifference(reference, snapshot) {
        if (reference.status !== snapshot.status)
            return true;
        if (reference.version !== snapshot.version)
            return true;
        if (Math.abs(new Date(reference.lastUpdated).getTime() -
            new Date(snapshot.lastUpdated).getTime()) > this.clockSkewToleranceMs) {
            return true;
        }
        if (sortPurposes(reference.purposes).join(',') !==
            sortPurposes(snapshot.purposes).join(',')) {
            return true;
        }
        const referenceMetadata = stableSerialize(reference.metadata ?? {});
        const snapshotMetadata = stableSerialize(snapshot.metadata ?? {});
        if (referenceMetadata !== snapshotMetadata)
            return true;
        const referencePrefs = stableSerialize(reference.preferences ?? {});
        const snapshotPrefs = stableSerialize(snapshot.preferences ?? {});
        return referencePrefs !== snapshotPrefs;
    }
    validateCompliance(consent) {
        const issues = [];
        const frameworks = [];
        if (consent.jurisdiction === 'GDPR' || consent.jurisdiction === 'GLOBAL') {
            frameworks.push('GDPR');
            if (!consent.lawfulBasis) {
                issues.push({
                    framework: 'GDPR',
                    severity: 'error',
                    code: 'GDPR_LAWFUL_BASIS_MISSING',
                    message: 'Lawful basis is required for GDPR consent records.',
                    field: 'lawfulBasis',
                });
            }
            if (!consent.purposes?.length) {
                issues.push({
                    framework: 'GDPR',
                    severity: 'error',
                    code: 'GDPR_PURPOSE_REQUIRED',
                    message: 'At least one declared purpose is required under GDPR.',
                    field: 'purposes',
                });
            }
            if (!consent.retention?.expiresAt) {
                issues.push({
                    framework: 'GDPR',
                    severity: 'warning',
                    code: 'GDPR_RETENTION_UNSPECIFIED',
                    message: 'Retention expiration should be defined for GDPR tracking.',
                    field: 'retention.expiresAt',
                });
            }
            if (this.requireProofForGdpr && !consent.proof) {
                issues.push({
                    framework: 'GDPR',
                    severity: 'warning',
                    code: 'GDPR_PROOF_MISSING',
                    message: 'Proof of consent capture is recommended for GDPR defensibility.',
                    field: 'proof',
                });
            }
        }
        if (consent.jurisdiction === 'CCPA' || consent.jurisdiction === 'GLOBAL') {
            frameworks.push('CCPA');
            const noticeProvided = Boolean(consent.metadata?.ccpaNoticeProvided);
            if (this.requireNoticeForCcpa && !noticeProvided) {
                issues.push({
                    framework: 'CCPA',
                    severity: 'error',
                    code: 'CCPA_NOTICE_REQUIRED',
                    message: 'CCPA requires notice to be provided prior to consent capture.',
                    field: 'metadata.ccpaNoticeProvided',
                });
            }
            if (consent.status === 'denied' &&
                consent.preferences?.doNotSell !== true) {
                issues.push({
                    framework: 'CCPA',
                    severity: 'warning',
                    code: 'CCPA_DNS_MISSING',
                    message: 'Denied status should include a Do Not Sell preference flag.',
                    field: 'preferences.doNotSell',
                });
            }
        }
        const dedupedFrameworks = Array.from(new Set(frameworks));
        return {
            isCompliant: issues.length === 0,
            checkedAt: new Date().toISOString(),
            issues,
            frameworks: dedupedFrameworks,
        };
    }
    detectDrift(canonical, snapshots) {
        const findings = [];
        const canonicalPurposes = sortPurposes(canonical.purposes);
        const canonicalPrefs = canonical.preferences ?? {};
        const canonicalMetadata = canonical.metadata ?? {};
        const canonicalTimestamp = new Date(canonical.lastUpdated).getTime();
        for (const snapshot of snapshots) {
            const deltas = [];
            if (snapshot.version !== canonical.version) {
                deltas.push({
                    field: 'version',
                    expected: canonical.version,
                    actual: snapshot.version,
                });
            }
            if (snapshot.status !== canonical.status) {
                deltas.push({
                    field: 'status',
                    expected: canonical.status,
                    actual: snapshot.status,
                });
            }
            const snapshotPurposes = sortPurposes(snapshot.purposes);
            if (snapshotPurposes.join(',') !== canonicalPurposes.join(',')) {
                deltas.push({
                    field: 'purposes',
                    expected: canonicalPurposes,
                    actual: snapshotPurposes,
                });
            }
            const snapshotTimestamp = new Date(snapshot.lastUpdated).getTime();
            if (Math.abs(snapshotTimestamp - canonicalTimestamp) >
                this.clockSkewToleranceMs) {
                deltas.push({
                    field: 'lastUpdated',
                    expected: canonical.lastUpdated,
                    actual: snapshot.lastUpdated,
                });
            }
            const snapshotPrefs = snapshot.preferences ?? {};
            const allPrefKeys = new Set([
                ...Object.keys(canonicalPrefs),
                ...Object.keys(snapshotPrefs),
            ]);
            for (const key of allPrefKeys) {
                if (canonicalPrefs[key] !== snapshotPrefs[key]) {
                    deltas.push({
                        field: `preferences.${key}`,
                        expected: canonicalPrefs[key],
                        actual: snapshotPrefs[key],
                    });
                }
            }
            const snapshotMetadata = snapshot.metadata ?? {};
            const allMetaKeys = new Set([
                ...Object.keys(canonicalMetadata),
                ...Object.keys(snapshotMetadata),
            ]);
            for (const key of allMetaKeys) {
                if (stableSerialize(canonicalMetadata[key]) !==
                    stableSerialize(snapshotMetadata[key])) {
                    deltas.push({
                        field: `metadata.${key}`,
                        expected: canonicalMetadata[key],
                        actual: snapshotMetadata[key],
                    });
                }
            }
            if (deltas.length) {
                findings.push({
                    source: snapshot.source,
                    deltas,
                    detectedAt: new Date().toISOString(),
                });
            }
        }
        return findings;
    }
    generateAuditTrail(canonical, stale, compliance, drift) {
        const timestamp = new Date().toISOString();
        const baseEntry = {
            consentId: canonical.consentId,
            timestamp,
            actor: this.actor,
        };
        const entries = [
            {
                ...baseEntry,
                action: 'RECONCILE',
                summary: `Reconciled consent ${canonical.consentId} to version ${canonical.version}`,
                details: {
                    canonicalSource: canonical.canonicalSource,
                    staleSources: stale.map((snapshot) => snapshot.source),
                    lastSyncedAt: canonical.lastSyncedAt,
                },
            },
        ];
        if (compliance.issues.length) {
            entries.push({
                ...baseEntry,
                action: 'COMPLIANCE_ALERT',
                summary: `Detected ${compliance.issues.length} compliance issues`,
                details: {
                    issues: compliance.issues,
                    frameworks: compliance.frameworks,
                },
            });
        }
        if (drift.length) {
            entries.push({
                ...baseEntry,
                action: 'DRIFT_DETECTED',
                summary: `Detected drift on ${drift.length} sources`,
                details: { drift },
            });
        }
        return entries;
    }
    omitSource(snapshot) {
        const { source, ...rest } = snapshot;
        return rest;
    }
}
exports.ConsentReconciler = ConsentReconciler;
