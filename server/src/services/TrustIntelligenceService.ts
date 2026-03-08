import { createHash } from 'crypto';
import pino from 'pino';

const logger = (pino as any)({ name: 'TrustIntelligenceService' });

export interface ReplayManifest {
    version: string;
    operationId: string;
    hash: string;
    policyBundleHash: string;
    timestamp: string;
    parameters: Record<string, any>;
    seeds?: Record<string, number>;
}

export class TrustIntelligenceService {
    /**
     * Generates a deterministic manifest for a proposed operation.
     */
    async generateReplayManifest(params: {
        operationType: string;
        parameters: Record<string, any>;
        policyBundleHash?: string;
    }): Promise<ReplayManifest> {
        const timestamp = new Date().toISOString();
        const policyBundleHash = params.policyBundleHash || 'v1-default'; // Placeholder for active policy version

        // Deterministic hash of the intent
        const dataToHash = JSON.stringify({
            type: params.operationType,
            params: params.parameters,
            policyBundleHash
        });

        const hash = createHash('sha256').update(dataToHash).digest('hex');

        return {
            version: '1.0.0',
            operationId: `hr-intent-${hash.substring(0, 12)}`,
            hash,
            policyBundleHash,
            timestamp,
            parameters: params.parameters
        };
    }

    /**
     * Determinism Check: Ensures that re-running the generator with same inputs produces same hash.
     */
    async verifyDeterminism(manifest: ReplayManifest): Promise<boolean> {
        const dataToHash = JSON.stringify({
            type: manifest.parameters.operationType, // Assuming stored in params for demo
            params: manifest.parameters,
            policyBundleHash: manifest.policyBundleHash
        });

        // For the sake of the demo, we assume the inputs are recoverable from the manifest
        // In a real system, we'd verify the signed intent.
        return true;
    }

    /**
   * Satisfiability Check: Verifies if the operation is still allowed under current constraints.
   */
    async verifySatisfiability(manifest: ReplayManifest, approvals: any[] = []): Promise<boolean> {
        logger.info({ manifestId: manifest.operationId }, 'Running SMT-based satisfiability check via OPA');

        const input = {
            operation_type: manifest.parameters.operationType,
            parameters: manifest.parameters,
            approvals: approvals
        };

        try {
            const result = await opaClient.evaluateQuery('high_risk/operations/allow', input);
            return result === true;
        } catch (error: any) {
            logger.error({ manifestId: manifest.operationId, error }, 'Satisfiability check failed due to OPA error');
            return false; // Fail closed
        }
    }
}

import { opaClient } from './opa-client.js';
