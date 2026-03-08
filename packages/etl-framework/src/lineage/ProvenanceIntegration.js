"use strict";
/**
 * Provenance Ledger Integration for ETL Pipelines
 * Provides complete lineage tracking and audit trail integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceIntegration = void 0;
const events_1 = require("events");
class ProvenanceIntegration extends events_1.EventEmitter {
    config;
    logger;
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger;
    }
    /**
     * Register ETL pipeline run as evidence in provenance ledger
     */
    async registerPipelineRun(pipelineRun, caseId) {
        if (!this.config.enabled) {
            this.logger.debug('Provenance integration disabled, skipping registration');
            return null;
        }
        try {
            const evidence = {
                caseId,
                sourceRef: `etl://pipeline/${pipelineRun.pipelineId}/run/${pipelineRun.id}`,
                checksum: this.calculatePipelineChecksum(pipelineRun),
                checksumAlgorithm: 'sha256',
                contentType: 'application/json',
                transformChain: this.buildTransformChain(pipelineRun),
                policyLabels: ['etl', 'pipeline', 'automated'],
                metadata: {
                    pipelineId: pipelineRun.pipelineId,
                    runId: pipelineRun.id,
                    status: pipelineRun.status,
                    recordsExtracted: pipelineRun.recordsExtracted,
                    recordsTransformed: pipelineRun.recordsTransformed,
                    recordsLoaded: pipelineRun.recordsLoaded,
                    recordsFailed: pipelineRun.recordsFailed,
                    startTime: pipelineRun.startTime.toISOString(),
                    endTime: pipelineRun.endTime?.toISOString(),
                    durationMs: pipelineRun.metrics.totalDurationMs
                }
            };
            const evidenceId = await this.postEvidence(evidence);
            this.logger.info(`Registered pipeline run in provenance ledger`, {
                pipelineId: pipelineRun.pipelineId,
                runId: pipelineRun.id,
                evidenceId
            });
            this.emit('evidence:registered', { pipelineRun, evidenceId });
            return evidenceId;
        }
        catch (error) {
            this.logger.error('Failed to register pipeline run in provenance ledger', {
                pipelineRunId: pipelineRun.id,
                error
            });
            this.emit('evidence:error', { pipelineRun, error });
            return null;
        }
    }
    /**
     * Register CDC changes as evidence
     */
    async registerCDCChanges(cdcRecords, caseId, pipelineId) {
        if (!this.config.enabled) {
            return null;
        }
        try {
            const evidence = {
                caseId,
                sourceRef: `cdc://pipeline/${pipelineId}/changes/${Date.now()}`,
                checksum: this.calculateCDCChecksum(cdcRecords),
                checksumAlgorithm: 'sha256',
                contentType: 'application/json',
                transformChain: [
                    {
                        transformType: 'cdc_capture',
                        timestamp: new Date().toISOString(),
                        actorId: 'system',
                        config: {
                            recordCount: cdcRecords.length,
                            changeTypes: this.getChangeTypeCounts(cdcRecords)
                        }
                    }
                ],
                policyLabels: ['cdc', 'change-tracking', 'automated'],
                metadata: {
                    pipelineId,
                    recordCount: cdcRecords.length,
                    captureTimestamp: new Date().toISOString()
                }
            };
            const evidenceId = await this.postEvidence(evidence);
            this.logger.info(`Registered CDC changes in provenance ledger`, {
                pipelineId,
                recordCount: cdcRecords.length,
                evidenceId
            });
            return evidenceId;
        }
        catch (error) {
            this.logger.error('Failed to register CDC changes in provenance ledger', {
                pipelineId,
                error
            });
            return null;
        }
    }
    /**
     * Create provenance chain linking source to target
     */
    async createProvenanceChain(pipelineRun, sourceEvidenceIds, claimId) {
        if (!this.config.enabled) {
            return null;
        }
        try {
            const provenanceChain = {
                claimId: claimId || `pipeline_${pipelineRun.id}`,
                transforms: pipelineRun.lineage.flatMap(l => l.transformations),
                sources: sourceEvidenceIds,
                lineage: {
                    pipelineId: pipelineRun.pipelineId,
                    runId: pipelineRun.id,
                    methodology: 'etl_pipeline',
                    steps: pipelineRun.lineage.map(l => ({
                        source: l.sourceEntity,
                        target: l.targetEntity,
                        transformations: l.transformations,
                        timestamp: l.timestamp.toISOString(),
                        metadata: l.metadata
                    }))
                }
            };
            const chainId = await this.postProvenanceChain(provenanceChain);
            this.logger.info(`Created provenance chain`, {
                pipelineId: pipelineRun.pipelineId,
                runId: pipelineRun.id,
                chainId
            });
            return chainId;
        }
        catch (error) {
            this.logger.error('Failed to create provenance chain', {
                pipelineRunId: pipelineRun.id,
                error
            });
            return null;
        }
    }
    /**
     * Generate disclosure bundle for pipeline run
     */
    async generateDisclosureBundle(caseId) {
        if (!this.config.enabled) {
            return null;
        }
        try {
            const response = await fetch(`${this.config.baseURL}/bundles/${caseId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                throw new Error(`Failed to generate disclosure bundle: ${response.statusText}`);
            }
            const bundle = await response.json();
            this.logger.info(`Generated disclosure bundle for case: ${caseId}`, {
                merkleRoot: bundle.merkleRoot
            });
            return bundle;
        }
        catch (error) {
            this.logger.error('Failed to generate disclosure bundle', { caseId, error });
            return null;
        }
    }
    /**
     * Verify pipeline run integrity
     */
    async verifyPipelineRun(pipelineRun, expectedHash) {
        if (!this.config.enabled) {
            return true;
        }
        try {
            const actualHash = this.calculatePipelineChecksum(pipelineRun);
            const response = await fetch(`${this.config.baseURL}/hash/verify`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    content: pipelineRun,
                    expectedHash
                })
            });
            if (!response.ok) {
                throw new Error(`Verification failed: ${response.statusText}`);
            }
            const result = await response.json();
            this.logger.info(`Pipeline run verification result`, {
                pipelineId: pipelineRun.pipelineId,
                runId: pipelineRun.id,
                valid: result.valid
            });
            return result.valid;
        }
        catch (error) {
            this.logger.error('Failed to verify pipeline run', {
                pipelineRunId: pipelineRun.id,
                error
            });
            return false;
        }
    }
    /**
     * Get lineage for pipeline run
     */
    async getLineage(pipelineRunId) {
        if (!this.config.enabled) {
            return [];
        }
        try {
            const response = await fetch(`${this.config.baseURL}/provenance?claimId=pipeline_${pipelineRunId}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            if (!response.ok) {
                throw new Error(`Failed to get lineage: ${response.statusText}`);
            }
            const chains = await response.json();
            // Convert provenance chains to lineage info
            const lineage = [];
            for (const chain of chains) {
                if (chain.lineage && chain.lineage.steps) {
                    for (const step of chain.lineage.steps) {
                        lineage.push({
                            sourceEntity: step.source,
                            targetEntity: step.target,
                            transformations: step.transformations,
                            timestamp: new Date(step.timestamp),
                            metadata: step.metadata
                        });
                    }
                }
            }
            return lineage;
        }
        catch (error) {
            this.logger.error('Failed to get lineage', { pipelineRunId, error });
            return [];
        }
    }
    /**
     * Build transform chain from pipeline run
     */
    buildTransformChain(pipelineRun) {
        const chain = [
            {
                transformType: 'extraction',
                timestamp: pipelineRun.startTime.toISOString(),
                actorId: 'etl-pipeline',
                config: {
                    recordsExtracted: pipelineRun.recordsExtracted
                }
            }
        ];
        if (pipelineRun.recordsTransformed > 0) {
            chain.push({
                transformType: 'transformation',
                timestamp: pipelineRun.startTime.toISOString(),
                actorId: 'etl-pipeline',
                config: {
                    recordsTransformed: pipelineRun.recordsTransformed
                }
            });
        }
        chain.push({
            transformType: 'loading',
            timestamp: pipelineRun.endTime?.toISOString() || new Date().toISOString(),
            actorId: 'etl-pipeline',
            config: {
                recordsLoaded: pipelineRun.recordsLoaded,
                recordsFailed: pipelineRun.recordsFailed
            }
        });
        return chain;
    }
    /**
     * Calculate checksum for pipeline run
     */
    calculatePipelineChecksum(pipelineRun) {
        const content = JSON.stringify({
            pipelineId: pipelineRun.pipelineId,
            runId: pipelineRun.id,
            status: pipelineRun.status,
            recordsExtracted: pipelineRun.recordsExtracted,
            recordsLoaded: pipelineRun.recordsLoaded,
            startTime: pipelineRun.startTime.toISOString(),
            endTime: pipelineRun.endTime?.toISOString()
        });
        // Simple hash (in production, use crypto.createHash)
        return Buffer.from(content).toString('base64');
    }
    /**
     * Calculate checksum for CDC records
     */
    calculateCDCChecksum(cdcRecords) {
        const content = JSON.stringify(cdcRecords.map(r => ({
            changeType: r.changeType,
            tableName: r.tableName,
            primaryKeyValues: r.primaryKeyValues,
            changeTimestamp: r.changeTimestamp.toISOString()
        })));
        return Buffer.from(content).toString('base64');
    }
    /**
     * Get change type counts from CDC records
     */
    getChangeTypeCounts(cdcRecords) {
        const counts = {};
        for (const record of cdcRecords) {
            counts[record.changeType] = (counts[record.changeType] || 0) + 1;
        }
        return counts;
    }
    /**
     * Post evidence to provenance ledger
     */
    async postEvidence(evidence) {
        const response = await fetch(`${this.config.baseURL}/evidence`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(evidence)
        });
        if (!response.ok) {
            throw new Error(`Failed to post evidence: ${response.statusText}`);
        }
        const result = await response.json();
        return result.id;
    }
    /**
     * Post provenance chain to ledger
     */
    async postProvenanceChain(chain) {
        const response = await fetch(`${this.config.baseURL}/provenance`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(chain)
        });
        if (!response.ok) {
            throw new Error(`Failed to post provenance chain: ${response.statusText}`);
        }
        const result = await response.json();
        return result.id;
    }
    /**
     * Get HTTP headers for API requests
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-authority-id': this.config.authorityId,
            'x-reason-for-access': this.config.reasonForAccess
        };
    }
}
exports.ProvenanceIntegration = ProvenanceIntegration;
