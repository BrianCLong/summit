import * as crypto from 'crypto';
import { Campaign } from '../../campaign/schema';
import { Report, Metrics, Stamp } from './types';
import { EnforcementResult } from '../../governance/cogops/enforcement';
import { CogOpsReport, CogOpsMetrics, CogOpsStamp } from './cogops_schemas';

function canonicalStringify(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalStringify).join(',') + ']';
    }
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(record[k])).join(',') + '}';
}

/**
 * Generates a deterministic ID following the EVID-COGOPS-[0-9a-f]{12} pattern.
 */
export function generateCogOpsEvidenceID(input: unknown): string {
    const canonicalInput = canonicalStringify(input);
    const hash = crypto.createHash('sha256').update(canonicalInput).digest('hex');
    const shortHash = hash.substring(0, 12);
    return `EVID-COGOPS-${shortHash}`;
}

export function createEvidenceBundle(
    campaign: Campaign,
    enforcementResult?: EnforcementResult
): { report: Report, metrics: Metrics, stamp: Stamp } {

    // Determine deterministic timestamp: latest action timestamp or fallback
    let timestamp = new Date().toISOString();
    if (campaign.actions && campaign.actions.length > 0) {
        const sortedActions = [...campaign.actions].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        timestamp = sortedActions[0].timestamp;
    }

    const evidenceId = generateCogOpsEvidenceID(campaign);

    const result = enforcementResult && !enforcementResult.allowed ? 'fail' : 'pass';
    const summary = enforcementResult && !enforcementResult.allowed
        ? `Campaign graph for ${campaign.name}. Violations: ${enforcementResult.violations.map(v => v.policyName).join(', ')}`
        : `Campaign graph for ${campaign.name}`;

    const report: Report = {
        evidence_id: evidenceId,
        subject: {
            type: 'campaign',
            name: campaign.name,
            digest: crypto.createHash('sha256').update(canonicalStringify(campaign)).digest('hex')
        },
        result: result,
        artifacts: [],
        summary: summary
    };

    const metrics: Metrics = {
        evidence_id: evidenceId,
        metadata: {
            actorCount: campaign.actors.length,
            assetCount: campaign.assets.length,
            narrativeCount: campaign.narratives.length,
            actionCount: campaign.actions.length,
            policyViolations: enforcementResult?.violations.length || 0
        }
    };

    const stamp: Stamp = {
        timestamp: timestamp
    };

    return { report, metrics, stamp };
}

/**
 * Assembles a CogOps-native evidence bundle conformant to schemas/cogops.
 */
export function assembleCogOpsBundle(
    campaign: Campaign,
    enforcementResult?: EnforcementResult
): { report: CogOpsReport, metrics: CogOpsMetrics, stamp: CogOpsStamp } {
    const timestamp = campaign.actions && campaign.actions.length > 0
        ? [...campaign.actions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
        : new Date().toISOString();

    const report_id = generateCogOpsEvidenceID(campaign);

    // Map campaign actions to findings
    const findings = (enforcementResult?.violations || []).map(v => {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (v.severity === 'critical' || v.severity === 'high') {
            severity = 'high';
        } else if (v.severity === 'medium') {
            severity = 'medium';
        }

        return {
            indicator_id: generateCogOpsEvidenceID({ policyId: v.policyId, campaignId: campaign.id }),
            indicator_type: 'amplification' as const, // Default mapping
            severity,
            confidence: 0.95,
            summary: `Policy violation: ${v.policyName}`,
            evidence_refs: [report_id]
        };
    });

    const report: CogOpsReport = {
        report_id,
        fixture_id: campaign.id,
        scope: {
            time_window: "2026-Q1",
            region: "GLOBAL",
            sources: campaign.assets.map(a => a.platform || 'unknown')
        },
        findings,
        evidence: campaign.evidence.map(e => ({
            evidence_id: generateCogOpsEvidenceID(e),
            source_ref: e.url || 'internal',
            selector: e.type,
            observation: `Captured ${e.type} artifact`
        })),
        resilience_scorecard: {
            overall_score: enforcementResult?.allowed ? 0.9 : 0.4,
            proxies: [
                {
                    proxy_type: 'trust_erosion',
                    value: enforcementResult?.allowed ? 0.1 : 0.6,
                    delta: 0.05,
                    confidence: 0.8,
                    evidence_refs: [report_id]
                }
            ]
        }
    };

    const metrics: CogOpsMetrics = {
        metrics_id: report_id,
        fixture_id: campaign.id,
        indicators: findings.map(f => ({
            indicator_type: f.indicator_type,
            score: f.severity === 'high' ? 0.9 : 0.5,
            confidence: f.confidence,
            evidence_refs: f.evidence_refs
        })),
        aggregates: {
            indicator_totals: {
                amplification: findings.length
            },
            proxy_totals: {
                trust_erosion: 1
            }
        }
    };

    const stamp: CogOpsStamp = {
        timestamp
    };

    return { report, metrics, stamp };
}
