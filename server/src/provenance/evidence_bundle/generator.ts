import * as crypto from 'crypto';
import { Campaign } from '../../campaign/schema';
import { Report, Metrics, Stamp } from './types';
import { EnforcementResult } from '../../governance/cogops/enforcement';

function toBase32(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let output = '';
    let value = 0;
    let bits = 0;

    for (let i = 0; i < buffer.length; i++) {
        value = (value << 8) | buffer[i];
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
}

function canonicalStringify(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
}

export function generateEvidenceID(input: any, dateStr: string): string {
    const canonicalInput = canonicalStringify(input);
    const hash = crypto.createHash('sha256').update(canonicalInput).digest();
    const base32 = toBase32(hash).substring(0, 6);
    const date = dateStr.slice(0, 10).replace(/-/g, '');
    return `EVID-COG-${date}-${base32}`;
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

    const evidenceId = generateEvidenceID(campaign, timestamp);

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
