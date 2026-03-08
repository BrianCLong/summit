"use strict";
/**
 * Data Envelope Resolvers
 *
 * GraphQL resolvers that wrap AI-generated responses in DataEnvelope
 * with full provenance, confidence, and governance metadata
 *
 * SOC 2 Controls: PI1.1, PI1.2, PI1.4, C1.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataEnvelopeResolvers = void 0;
exports.generateHypothesesWithEnvelope = generateHypothesesWithEnvelope;
exports.generateNarrativeWithEnvelope = generateNarrativeWithEnvelope;
exports.computeRiskWithEnvelope = computeRiskWithEnvelope;
exports.exportWithProvenance = exportWithProvenance;
const data_envelope_js_1 = require("../types/data-envelope.js");
const crypto_1 = require("crypto");
const policyWrapper_js_1 = require("./policyWrapper.js");
// Stubbed imports for missing services
// import { getProvenance } from '../../prov-ledger-service/src/ledger.js';
// import { checkLicensesWithContext } from '../../prov-ledger-service/src/ledger.js';
/**
 * Resolver for generateHypothesesWithEnvelope
 */
async function generateHypothesesWithEnvelope(_parent, args, context) {
    const { input } = args;
    const { investigationId, focusEntityIds, count } = input;
    // Generate hypotheses (simulated for now - replace with actual implementation)
    const hypotheses = await generateHypotheses(investigationId, focusEntityIds, count);
    // Wrap each hypothesis in an envelope
    return hypotheses.map((hypothesis) => {
        const confidence = hypothesis.confidence || 0.85;
        const isSimulated = context.simulationMode || false;
        return (0, data_envelope_js_1.createDataEnvelope)(hypothesis, {
            source: 'ai-hypothesis-generator-v1.2.0',
            actor: context.userId || 'system',
            version: '1.2.0',
            confidence,
            isSimulated,
            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
            // Automatic governance verdict for hypothesis generation
            governanceVerdict: {
                verdictId: (0, crypto_1.randomUUID)(),
                policyId: 'policy:hypothesis:auto',
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                decidedAt: new Date(),
                reason: 'Automated hypothesis generation within safe bounds',
                evaluator: 'hypothesis-generator'
            },
            lineage: [
                {
                    id: (0, crypto_1.randomUUID)(),
                    operation: 'hypothesis-generation',
                    inputs: focusEntityIds || [],
                    timestamp: new Date(),
                    actor: context.userId,
                    metadata: {
                        investigationId,
                        count,
                        model: 'hypothesis-generator-v1.2.0',
                    },
                },
            ],
            warnings: confidence < 0.7 ? ['Low confidence hypothesis - manual review recommended'] : [],
        });
    });
}
/**
 * Resolver for generateNarrativeWithEnvelope
 */
async function generateNarrativeWithEnvelope(_parent, args, context) {
    const { input } = args;
    const { investigationId, theme, keyEntityIds, style } = input;
    // Generate narrative (simulated for now - replace with actual implementation)
    const narrative = await generateNarrative(investigationId, theme, keyEntityIds, style);
    const confidence = narrative.confidence || 0.90;
    const isSimulated = context.simulationMode || false;
    return (0, data_envelope_js_1.createDataEnvelope)(narrative, {
        source: 'ai-narrative-builder-v2.0.0',
        actor: context.userId || 'system',
        version: '2.0.0',
        confidence,
        isSimulated,
        classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
        // Automatic governance verdict for narrative generation
        governanceVerdict: {
            verdictId: (0, crypto_1.randomUUID)(),
            policyId: 'policy:narrative:auto',
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            decidedAt: new Date(),
            reason: 'Automated narrative generation enabled',
            evaluator: 'narrative-builder'
        },
        lineage: [
            {
                id: (0, crypto_1.randomUUID)(),
                operation: 'narrative-generation',
                inputs: keyEntityIds || [],
                timestamp: new Date(),
                actor: context.userId,
                metadata: {
                    investigationId,
                    theme,
                    style,
                    model: 'narrative-builder-v2.0.0',
                },
            },
        ],
        warnings: [],
    });
}
/**
 * Resolver for computeRiskWithEnvelope
 */
async function computeRiskWithEnvelope(_parent, args, context) {
    const { input } = args;
    // Compute risk with XAI reasoning trace
    const reasoningTrace = await computeRiskWithExplanation(input);
    const confidence = reasoningTrace.modelOutput?.score ? 0.95 : 0.80;
    const isSimulated = context.simulationMode || false;
    return (0, data_envelope_js_1.createDataEnvelope)(reasoningTrace, {
        source: 'xai-risk-engine-v3.1.0',
        actor: context.userId || 'system',
        version: '3.1.0',
        confidence,
        isSimulated,
        classification: data_envelope_js_1.DataClassification.RESTRICTED,
        // Strict governance verdict for risk computation
        governanceVerdict: {
            verdictId: (0, crypto_1.randomUUID)(),
            policyId: 'policy:risk:strict',
            result: data_envelope_js_1.GovernanceResult.ALLOW,
            decidedAt: new Date(),
            reason: 'Risk computation authorized for user',
            evaluator: 'risk-engine'
        },
        lineage: [
            {
                id: (0, crypto_1.randomUUID)(),
                operation: 'risk-computation',
                inputs: input.features ? Object.keys(input.features) : [],
                timestamp: new Date(),
                actor: context.userId,
                metadata: {
                    window: input.window,
                    model: 'xai-risk-engine-v3.1.0',
                    features: input.features,
                },
            },
        ],
        warnings: confidence < 0.85 ? ['Medium confidence risk score - consider additional validation'] : [],
    });
}
/**
 * Resolver for exportWithProvenance
 */
async function exportWithProvenance(_parent, args, context) {
    const { itemIds, format, purpose, destination } = args;
    // Collect items and wrap in envelopes
    const items = await Promise.all(itemIds.map(async (itemId) => {
        const item = await fetchItem(itemId);
        const provenance = await getProvenance(itemId);
        return (0, data_envelope_js_1.createDataEnvelope)(item, {
            source: provenance?.source.source || 'unknown',
            actor: context.userId,
            confidence: provenance?.confidence,
            isSimulated: context.simulationMode || false,
            classification: item.classification || data_envelope_js_1.DataClassification.INTERNAL,
            governanceVerdict: {
                verdictId: (0, crypto_1.randomUUID)(),
                policyId: 'policy:export:check',
                result: data_envelope_js_1.GovernanceResult.ALLOW,
                decidedAt: new Date(),
                reason: 'Export item allowed',
                evaluator: 'export-service'
            },
            lineage: provenance?.lineage || [],
        });
    }));
    // Extract licenses from provenance
    const licenses = new Set();
    items.forEach((item) => {
        item.provenance.lineage.forEach((node) => {
            if (node.metadata?.licenseId) {
                licenses.add(node.metadata.licenseId);
            }
        });
    });
    // Check license compatibility with policy context
    const licenseCheck = checkLicensesWithContext(Array.from(licenses), {
        userId: context.userId,
        tenantId: context.tenantId,
        purpose,
        exportType: getExportType(format),
        destination,
    });
    // Calculate merkle root for bundle integrity
    const hashes = items.map((item) => item.dataHash);
    const merkleRoot = calculateMerkleRoot(hashes);
    const exportId = (0, crypto_1.randomUUID)();
    const generatedAt = new Date();
    const exportBundle = {
        exportId,
        items,
        provenance: {
            source: 'export-service-v1.0.0',
            generatedAt,
            lineage: [
                {
                    id: (0, crypto_1.randomUUID)(),
                    operation: 'export-bundle-creation',
                    inputs: itemIds,
                    timestamp: generatedAt,
                    actor: context.userId,
                    metadata: {
                        format,
                        purpose,
                        destination,
                        itemCount: items.length,
                    },
                },
            ],
            actor: context.userId,
            version: '1.0.0',
            provenanceId: (0, crypto_1.randomUUID)(),
        },
        format,
        licenses: Array.from(licenses),
        licenseCheck: {
            valid: licenseCheck.valid,
            reason: licenseCheck.reason,
            appealCode: licenseCheck.appealCode,
            appealUrl: licenseCheck.appealUrl,
            policyDecision: licenseCheck.policyDecision,
            riskAssessment: licenseCheck.riskAssessment,
        },
        merkleRoot,
        generatedAt,
    };
    return exportBundle;
}
// Helper functions (replace with actual implementations)
async function generateHypotheses(investigationId, focusEntityIds, count) {
    // Simulated implementation - replace with actual AI service
    return [
        {
            id: (0, crypto_1.randomUUID)(),
            statement: 'Entity A is connected to Entity B through intermediary C',
            confidence: 0.85,
            supportingEvidence: [
                {
                    id: (0, crypto_1.randomUUID)(),
                    type: 'relationship',
                    description: 'Direct financial transaction observed',
                    strength: 0.9,
                    sourceIds: ['entity-a', 'entity-b'],
                },
            ],
            involvedEntities: focusEntityIds || [],
            suggestedSteps: ['Investigate intermediary C', 'Analyze transaction patterns'],
        },
    ];
}
async function generateNarrative(investigationId, theme, keyEntityIds, style) {
    // Simulated implementation - replace with actual AI service
    return {
        id: (0, crypto_1.randomUUID)(),
        investigationId,
        title: `Investigation Narrative: ${theme || 'Overview'}`,
        content: '# Investigation Summary\n\nBased on the analysis of the knowledge graph...',
        keyFindings: ['Finding 1', 'Finding 2'],
        citations: keyEntityIds || [],
        supportingPaths: [],
        confidence: 0.90,
        createdAt: new Date().toISOString(),
        auditId: (0, crypto_1.randomUUID)(),
    };
}
async function computeRiskWithExplanation(input) {
    // Simulated implementation - replace with actual XAI service
    return {
        traceId: (0, crypto_1.randomUUID)(),
        modelOutput: {
            score: 0.75,
            band: 'MEDIUM',
            contributions: [],
            window: input.window,
            computedAt: new Date(),
            modelVersion: '3.1.0',
        },
        inputSummary: {
            inputHash: (0, crypto_1.createHash)('sha256').update(JSON.stringify(input.features)).digest('hex'),
            inputType: 'FEATURES',
            featureCount: Object.keys(input.features || {}).length,
            featureNames: Object.keys(input.features || {}),
            inputStatistics: { mean: 0, std: 0, min: 0, max: 0, nonZeroCount: 0 },
            timestamp: new Date(),
        },
        modelMetadata: {
            modelName: 'xai-risk-engine',
            modelVersion: '3.1.0',
            modelType: 'RISK_ENGINE',
            parameters: {},
            lastUpdated: new Date(),
        },
        saliencyExplanations: [],
        intermediateSteps: [],
        timestamp: new Date(),
        traceDigest: (0, crypto_1.randomUUID)(),
    };
}
async function fetchItem(itemId) {
    // Simulated implementation - replace with actual data fetching
    return {
        id: itemId,
        data: { content: 'Item data' },
        classification: data_envelope_js_1.DataClassification.INTERNAL,
    };
}
function getExportType(format) {
    switch (format) {
        case data_envelope_js_1.ExportFormat.PDF:
            return 'report';
        case data_envelope_js_1.ExportFormat.CSV:
        case data_envelope_js_1.ExportFormat.EXCEL:
            return 'dataset';
        case data_envelope_js_1.ExportFormat.JSON:
        case data_envelope_js_1.ExportFormat.XML:
            return 'api';
        default:
            return 'analysis';
    }
}
function calculateMerkleRoot(hashes) {
    if (hashes.length === 0)
        return '';
    let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
    while (nodes.length > 1) {
        const next = [];
        for (let i = 0; i < nodes.length; i += 2) {
            if (i + 1 < nodes.length) {
                next.push((0, crypto_1.createHash)('sha256')
                    .update(Buffer.concat([nodes[i], nodes[i + 1]]))
                    .digest());
            }
            else {
                next.push(nodes[i]);
            }
        }
        nodes = next;
    }
    return nodes[0].toString('hex');
}
async function getProvenance(itemId) {
    return {
        source: { source: 'simulated-ledger' },
        confidence: 0.9,
        lineage: []
    };
}
function checkLicensesWithContext(licenses, context) {
    return {
        valid: true,
        reason: 'Simulated license check passed',
        appealCode: null,
        appealUrl: null,
        policyDecision: 'APPROVED',
        riskAssessment: 'LOW'
    };
}
exports.dataEnvelopeResolvers = (0, policyWrapper_js_1.wrapResolversWithPolicy)('DataEnvelope', {
    Query: {
        generateHypothesesWithEnvelope,
        generateNarrativeWithEnvelope,
        computeRiskWithEnvelope,
    },
    Mutation: {
        exportWithProvenance,
    },
});
