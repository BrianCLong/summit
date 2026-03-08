"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSampleReceipt = buildSampleReceipt;
exports.buildSamplePolicyDecision = buildSamplePolicyDecision;
function buildSampleReceipt() {
    return {
        id: 'receipt-demo-001',
        version: '0.1.0',
        caseId: 'case-1234',
        claimIds: ['claim-2', 'claim-1'],
        createdAt: '2025-01-15T12:00:00.000Z',
        actor: {
            displayName: 'Analyst Ada',
            role: 'investigator',
            id: 'analyst-7',
            tenantId: 'tenant-9',
        },
        pipeline: {
            runId: 'run-777',
            stage: 'ingest',
            step: 'normalize',
            taskId: 'task-55',
        },
        payloadHash: 'placeholder',
        signature: {
            algorithm: 'ed25519',
            keyId: 'signer-01',
            publicKey: 'cHVibGljLWtleS1kZW1v',
            value: 'c2lnbmF0dXJlLXZhbHVl',
            signedAt: '2025-01-15T12:00:01.000Z',
        },
        proofs: {
            receiptHash: 'placeholder',
            manifestMerkleRoot: 'root-123',
            claimHashes: ['hash-b', 'hash-a'],
        },
        metadata: {
            source: 'stream-ingestion',
            priority: 5,
            tags: ['ingestion', 'normalization'],
        },
        redactions: [
            {
                path: 'metadata.secrets',
                reason: 'strip-sensitive',
                appliedAt: '2025-01-15T12:00:02.000Z',
                appliedBy: 'policy-engine',
            },
        ],
    };
}
function buildSamplePolicyDecision() {
    return {
        decision: 'DENY',
        reasons: [
            {
                clause: {
                    id: 'license-1-clause-1',
                    type: 'USAGE',
                    description: 'Export outside approved region',
                    enforcementLevel: 'HARD',
                    constraints: { regions: ['eu-west-1', 'us-east-1'] },
                },
                licenseId: 'license-1',
                impact: 'BLOCKING',
                explanation: 'Request targets restricted region',
                suggestedAction: 'route-through-approved-region',
            },
            {
                clause: {
                    id: 'license-2-clause-3',
                    type: 'PURPOSE',
                    description: 'Purpose must be incident response',
                    enforcementLevel: 'SOFT',
                    constraints: { purposes: ['ir'], escalation: true },
                },
                licenseId: 'license-2',
                impact: 'WARNING',
                explanation: 'Purpose missing',
                suggestedAction: 'collect-justification',
            },
        ],
        conditions: ['provide-regional-approval'],
        overrideWorkflow: 'security-review',
    };
}
