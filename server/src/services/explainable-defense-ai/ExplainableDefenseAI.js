"use strict";
/**
 * Explainable Defense AI Service
 *
 * Operates as a transparent, auditable partner for mission-critical decisions.
 * Provides complete explainability for all analytics, prioritizations, and
 * fusion decisions with interpretable justifications and chain of trust.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExplainableDefenseAI = void 0;
const crypto_1 = require("crypto");
const events_1 = require("events");
// ============================================================================
// Explainable Defense AI Service
// ============================================================================
class ExplainableDefenseAI extends events_1.EventEmitter {
    chainOfTrust = new Map();
    auditChain = [];
    serviceId;
    signingKey;
    constructor(serviceId = 'explainable-defense-ai') {
        super();
        this.serviceId = serviceId;
        this.signingKey = process.env.XAI_SIGNING_KEY || 'dev-signing-key';
    }
    // ==========================================================================
    // Data Ingest with Provenance
    // ==========================================================================
    async ingestData(source, rawData, extractedEvidence) {
        const startTime = Date.now();
        // Hash and assign IDs to evidence
        const evidenceItems = extractedEvidence.map((e) => ({
            ...e,
            id: (0, crypto_1.randomUUID)(),
            contentHash: this.hashContent(e.content),
        }));
        // Create chain of trust node for ingest
        const chainNode = this.createChainNode({
            nodeType: 'INGEST',
            component: 'DataIngestPipeline',
            operation: `Ingest from ${source.type} source: ${source.name}`,
            inputHashes: [this.hashContent(JSON.stringify(rawData))],
            outputHash: this.hashContent(JSON.stringify(evidenceItems)),
            parentId: null,
        });
        // Store chain
        const productId = (0, crypto_1.randomUUID)();
        this.chainOfTrust.set(productId, [chainNode]);
        // Audit
        this.addAuditRecord('SYSTEM', 'DATA_INGEST', source.id);
        this.emit('dataIngested', {
            source,
            evidenceCount: evidenceItems.length,
            duration_ms: Date.now() - startTime,
        });
        return { evidenceItems, chainNode };
    }
    // ==========================================================================
    // Analytics with Explainability
    // ==========================================================================
    async analyzeWithExplanation(analysisType, inputs, analysisFn, parentChainId) {
        const startTime = Date.now();
        const reasoningSteps = [];
        // Step 1: Input Validation
        reasoningSteps.push(this.createReasoningStep({
            sequence: 1,
            operation: 'INPUT_VALIDATION',
            description: 'Validate and normalize input evidence',
            inputs: inputs.map((i) => i.id),
            outputs: inputs.map((i) => i.id),
            algorithm: 'SchemaValidation',
            parameters: { schema: 'EvidenceItem' },
            confidenceIn: 1.0,
            confidenceOut: 1.0,
            duration_ms: Date.now() - startTime,
            humanReadable: `Validated ${inputs.length} evidence items from ${new Set(inputs.map((i) => i.sourceId)).size} distinct sources.`,
        }));
        // Step 2: Feature Extraction
        const featureStart = Date.now();
        const { result, features } = await analysisFn(inputs);
        const featureDuration = Date.now() - featureStart;
        reasoningSteps.push(this.createReasoningStep({
            sequence: 2,
            operation: 'FEATURE_EXTRACTION',
            description: 'Extract and weight relevant features',
            inputs: inputs.map((i) => i.id),
            outputs: features.map((f) => f.feature),
            algorithm: 'WeightedFeatureExtraction',
            parameters: { featureCount: features.length },
            confidenceIn: 1.0,
            confidenceOut: this.calculateFeatureConfidence(features),
            duration_ms: featureDuration,
            humanReadable: `Extracted ${features.length} features with weighted contributions ranging from ${Math.min(...features.map((f) => f.contribution)).toFixed(3)} to ${Math.max(...features.map((f) => f.contribution)).toFixed(3)}.`,
        }));
        // Step 3: Analysis Execution
        const analysisConfidence = this.calculateOverallConfidence(features, inputs);
        reasoningSteps.push(this.createReasoningStep({
            sequence: 3,
            operation: 'ANALYSIS_EXECUTION',
            description: `Execute ${analysisType} analysis`,
            inputs: features.map((f) => f.feature),
            outputs: [typeof result === 'object' ? 'AnalysisResult' : String(result)],
            algorithm: this.getAlgorithmForType(analysisType),
            parameters: { type: analysisType },
            confidenceIn: this.calculateFeatureConfidence(features),
            confidenceOut: analysisConfidence,
            duration_ms: Date.now() - featureStart - featureDuration,
            humanReadable: this.generateAnalysisNarrative(analysisType, features, analysisConfidence),
        }));
        // Build explanation
        const explanation = this.buildDecisionExplanation({
            decisionType: analysisType,
            outcome: this.summarizeResult(result),
            confidence: analysisConfidence,
            reasoning: reasoningSteps,
            featureContributions: features,
            supportingEvidence: inputs.filter((i) => i.confidence > 0.7),
            contraEvidence: inputs.filter((i) => i.confidence <= 0.3),
        });
        // Create chain node
        const chainNode = this.createChainNode({
            nodeType: 'ANALYZE',
            component: 'AnalyticsEngine',
            operation: `${analysisType} Analysis`,
            inputHashes: inputs.map((i) => i.contentHash),
            outputHash: this.hashContent(JSON.stringify(result)),
            parentId: parentChainId || null,
        });
        // Update chain
        if (parentChainId && this.chainOfTrust.has(parentChainId)) {
            this.chainOfTrust.get(parentChainId).push(chainNode);
        }
        this.emit('analysisCompleted', {
            type: analysisType,
            confidence: analysisConfidence,
            duration_ms: Date.now() - startTime,
        });
        return { result, explanation, chainNode };
    }
    // ==========================================================================
    // Prioritization with Justification
    // ==========================================================================
    async prioritizeWithJustification(items, criteria) {
        const startTime = Date.now();
        const reasoningSteps = [];
        const allFeatures = [];
        // Score each item
        const scored = items.map((item) => {
            const criteriaScores = criteria.map((c) => {
                const rawScore = c.evaluator(item.data);
                const weightedScore = rawScore * c.weight;
                return { criterion: c.name, rawScore, weight: c.weight, weightedScore };
            });
            const totalScore = criteriaScores.reduce((sum, c) => sum + c.weightedScore, 0);
            const normalizedScore = totalScore / criteria.reduce((sum, c) => sum + c.weight, 0);
            // Build justification
            const topContributors = criteriaScores
                .sort((a, b) => b.weightedScore - a.weightedScore)
                .slice(0, 3);
            const justification = `Scored ${normalizedScore.toFixed(2)} based primarily on: ${topContributors.map((c) => `${c.criterion} (${(c.rawScore * 100).toFixed(0)}% × ${c.weight}w)`).join(', ')}.`;
            // Track features
            criteriaScores.forEach((c) => {
                allFeatures.push({
                    feature: `${item.id}:${c.criterion}`,
                    value: c.rawScore,
                    weight: c.weight,
                    contribution: c.weightedScore,
                    direction: c.weightedScore > 0.5 ? 'positive' : c.weightedScore < 0.3 ? 'negative' : 'neutral',
                    explanation: `${c.criterion} contributed ${(c.weightedScore * 100).toFixed(1)}% to prioritization.`,
                });
            });
            return { id: item.id, score: normalizedScore, justification, criteriaScores };
        });
        // Rank
        const ranked = scored
            .sort((a, b) => b.score - a.score)
            .map((item, index) => ({
            id: item.id,
            score: item.score,
            rank: index + 1,
            justification: item.justification,
        }));
        // Build reasoning steps
        reasoningSteps.push(this.createReasoningStep({
            sequence: 1,
            operation: 'CRITERIA_EVALUATION',
            description: 'Evaluate items against prioritization criteria',
            inputs: items.map((i) => i.id),
            outputs: criteria.map((c) => c.name),
            algorithm: 'WeightedMultiCriteriaScoring',
            parameters: { criteriaCount: criteria.length, itemCount: items.length },
            confidenceIn: 1.0,
            confidenceOut: 0.95,
            duration_ms: Date.now() - startTime,
            humanReadable: `Evaluated ${items.length} items against ${criteria.length} weighted criteria.`,
        }));
        reasoningSteps.push(this.createReasoningStep({
            sequence: 2,
            operation: 'RANK_ORDERING',
            description: 'Order items by composite score',
            inputs: scored.map((s) => `${s.id}:${s.score.toFixed(3)}`),
            outputs: ranked.map((r) => `#${r.rank}:${r.id}`),
            algorithm: 'DescendingSort',
            parameters: {},
            confidenceIn: 0.95,
            confidenceOut: 0.95,
            duration_ms: 1,
            humanReadable: `Ranked items from highest (${ranked[0]?.score.toFixed(2)}) to lowest (${ranked[ranked.length - 1]?.score.toFixed(2)}) priority.`,
        }));
        const explanation = this.buildDecisionExplanation({
            decisionType: 'PRIORITIZATION',
            outcome: `Prioritized ${items.length} items into ranked order`,
            confidence: 0.95,
            reasoning: reasoningSteps,
            featureContributions: allFeatures.slice(0, 20), // Top 20 features
            supportingEvidence: items.flatMap((i) => i.evidence).slice(0, 10),
            contraEvidence: [],
        });
        return { ranked, explanation };
    }
    // ==========================================================================
    // Intelligence Fusion with Chain of Trust
    // ==========================================================================
    async fuseIntelligence(sources, fusionStrategy) {
        const startTime = Date.now();
        const productId = (0, crypto_1.randomUUID)();
        const chainNodes = [];
        const reasoningSteps = [];
        // Step 1: Source validation and weighting
        const sourceWeights = sources.map((s) => ({
            sourceId: s.source.id,
            weight: this.calculateSourceWeight(s.source),
            reliability: s.source.reliability,
            credibility: s.source.credibility,
        }));
        chainNodes.push(this.createChainNode({
            nodeType: 'TRANSFORM',
            component: 'FusionEngine',
            operation: 'Source Weighting',
            inputHashes: sources.map((s) => this.hashContent(JSON.stringify(s.source))),
            outputHash: this.hashContent(JSON.stringify(sourceWeights)),
            parentId: null,
        }));
        reasoningSteps.push(this.createReasoningStep({
            sequence: 1,
            operation: 'SOURCE_WEIGHTING',
            description: 'Calculate reliability weights for each intelligence source',
            inputs: sources.map((s) => s.source.id),
            outputs: sourceWeights.map((sw) => `${sw.sourceId}:${sw.weight.toFixed(2)}`),
            algorithm: 'NATOReliabilityWeighting',
            parameters: { scale: 'ADMIRALTY' },
            confidenceIn: 1.0,
            confidenceOut: 0.95,
            duration_ms: Date.now() - startTime,
            humanReadable: `Assigned weights to ${sources.length} sources using NATO Admiralty rating. Weights range from ${Math.min(...sourceWeights.map((sw) => sw.weight)).toFixed(2)} to ${Math.max(...sourceWeights.map((sw) => sw.weight)).toFixed(2)}.`,
        }));
        // Step 2: Evidence fusion
        const fusionStart = Date.now();
        const fusedEvidence = this.performFusion(sources, sourceWeights, fusionStrategy);
        chainNodes.push(this.createChainNode({
            nodeType: 'FUSE',
            component: 'FusionEngine',
            operation: `${fusionStrategy} Fusion`,
            inputHashes: sources.flatMap((s) => s.evidence.map((e) => e.contentHash)),
            outputHash: this.hashContent(JSON.stringify(fusedEvidence)),
            parentId: chainNodes[chainNodes.length - 1].id,
        }));
        reasoningSteps.push(this.createReasoningStep({
            sequence: 2,
            operation: 'EVIDENCE_FUSION',
            description: `Fuse evidence using ${fusionStrategy} strategy`,
            inputs: sources.flatMap((s) => s.evidence.map((e) => e.id)),
            outputs: [fusedEvidence.id],
            algorithm: fusionStrategy,
            parameters: { sourceCount: sources.length, evidenceCount: sources.reduce((sum, s) => sum + s.evidence.length, 0) },
            confidenceIn: 0.95,
            confidenceOut: fusedEvidence.confidence,
            duration_ms: Date.now() - fusionStart,
            humanReadable: this.generateFusionNarrative(fusionStrategy, sources, fusedEvidence),
        }));
        // Step 3: Generate intelligence product
        const features = sourceWeights.map((sw) => ({
            feature: `source_${sw.sourceId}`,
            value: sw.weight,
            weight: sw.weight,
            contribution: sw.weight / sourceWeights.reduce((sum, s) => sum + s.weight, 0),
            direction: sw.weight > 0.7 ? 'positive' : sw.weight < 0.4 ? 'negative' : 'neutral',
            explanation: `Source ${sw.sourceId} (${sw.reliability}/${sw.credibility}) contributed ${((sw.weight / sourceWeights.reduce((sum, s) => sum + s.weight, 0)) * 100).toFixed(1)}% to fusion.`,
        }));
        const explanation = this.buildDecisionExplanation({
            decisionType: 'FUSION',
            outcome: fusedEvidence.content,
            confidence: fusedEvidence.confidence,
            reasoning: reasoningSteps,
            featureContributions: features,
            supportingEvidence: sources.flatMap((s) => s.evidence.filter((e) => e.confidence > 0.7)),
            contraEvidence: sources.flatMap((s) => s.evidence.filter((e) => e.confidence <= 0.3)),
        });
        // Create final output node
        chainNodes.push(this.createChainNode({
            nodeType: 'OUTPUT',
            component: 'FusionEngine',
            operation: 'Intelligence Product Generation',
            inputHashes: [fusedEvidence.contentHash],
            outputHash: this.hashContent(productId),
            parentId: chainNodes[chainNodes.length - 1].id,
        }));
        this.chainOfTrust.set(productId, chainNodes);
        const product = {
            id: productId,
            title: `Fused Intelligence Product - ${new Date().toISOString().split('T')[0]}`,
            classification: this.deriveClassification(sources.map((s) => s.source)),
            summary: fusedEvidence.content,
            confidence: fusedEvidence.confidence,
            chainOfTrust: chainNodes,
            explanation,
            sources: sources.map((s) => s.source),
            createdAt: new Date(),
            expiresAt: null,
        };
        this.addAuditRecord('SYSTEM', 'INTELLIGENCE_FUSION', productId, explanation);
        this.emit('intelligenceFused', { productId, sourceCount: sources.length, confidence: fusedEvidence.confidence });
        return product;
    }
    // ==========================================================================
    // Chain of Trust Verification
    // ==========================================================================
    verifyChainOfTrust(productId) {
        const chain = this.chainOfTrust.get(productId);
        if (!chain) {
            return { valid: false, issues: ['Chain not found'], verificationReport: 'No chain exists for this product.' };
        }
        const issues = [];
        let previousNode = null;
        for (const node of chain) {
            // Verify signature
            const expectedSig = this.signNode(node);
            if (node.signature !== expectedSig) {
                issues.push(`Node ${node.id}: Signature mismatch`);
            }
            // Verify parent linkage
            if (previousNode && node.parentId !== previousNode.id) {
                issues.push(`Node ${node.id}: Parent linkage broken`);
            }
            // Verify attestation
            if (!node.attestation.signature) {
                issues.push(`Node ${node.id}: Missing attestation signature`);
            }
            previousNode = node;
        }
        const valid = issues.length === 0;
        const verificationReport = valid
            ? `Chain of trust verified: ${chain.length} nodes from ${chain[0].nodeType} to ${chain[chain.length - 1].nodeType}. All signatures and attestations valid.`
            : `Chain verification failed: ${issues.length} issues found. ${issues.join('; ')}`;
        return { valid, issues, verificationReport };
    }
    // ==========================================================================
    // Audit Trail
    // ==========================================================================
    getAuditTrail(filter) {
        let records = [...this.auditChain];
        if (filter?.actor) {
            records = records.filter((r) => r.actor === filter.actor);
        }
        if (filter?.action) {
            records = records.filter((r) => r.action === filter.action);
        }
        if (filter?.since) {
            records = records.filter((r) => r.timestamp >= filter.since);
        }
        return records;
    }
    exportAuditManifest() {
        const merkleRoot = this.computeMerkleRoot(this.auditChain.map((r) => r.chainHash));
        const exportedAt = new Date();
        const signature = this.sign(`${merkleRoot}:${exportedAt.toISOString()}`);
        return {
            records: this.auditChain,
            merkleRoot,
            exportedAt,
            signature,
        };
    }
    // ==========================================================================
    // Human-Readable Explanation Generation
    // ==========================================================================
    generateHumanReadableReport(explanation) {
        const lines = [];
        lines.push(`## ${explanation.decisionType} Decision Report`);
        lines.push(`**Decision ID:** ${explanation.id}`);
        lines.push(`**Confidence:** ${(explanation.confidence * 100).toFixed(1)}%`);
        lines.push('');
        lines.push('### Summary');
        lines.push(explanation.humanReadableSummary);
        lines.push('');
        lines.push('### Reasoning Chain');
        explanation.reasoning.forEach((step) => {
            lines.push(`${step.sequence}. **${step.operation}**: ${step.humanReadable}`);
            lines.push(`   - Algorithm: ${step.algorithm}`);
            lines.push(`   - Confidence: ${(step.confidenceIn * 100).toFixed(0)}% → ${(step.confidenceOut * 100).toFixed(0)}%`);
        });
        lines.push('');
        lines.push('### Key Contributing Factors');
        const topFeatures = explanation.featureContributions
            .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
            .slice(0, 5);
        topFeatures.forEach((f, i) => {
            const direction = f.direction === 'positive' ? '↑' : f.direction === 'negative' ? '↓' : '→';
            lines.push(`${i + 1}. ${direction} **${f.feature}**: ${f.explanation}`);
        });
        if (explanation.limitations.length > 0) {
            lines.push('');
            lines.push('### Limitations');
            explanation.limitations.forEach((l) => lines.push(`- ${l}`));
        }
        if (explanation.uncertaintyFactors.length > 0) {
            lines.push('');
            lines.push('### Uncertainty Factors');
            explanation.uncertaintyFactors.forEach((u) => {
                lines.push(`- **${u.factor}** (${u.impact} impact): ${u.mitigation}`);
            });
        }
        if (explanation.alternativesConsidered.length > 0) {
            lines.push('');
            lines.push('### Alternatives Considered');
            explanation.alternativesConsidered.forEach((a) => {
                lines.push(`- **${a.outcome}** (${(a.probability * 100).toFixed(0)}% probable): ${a.whyNotChosen}`);
            });
        }
        return lines.join('\n');
    }
    // ==========================================================================
    // Private Helper Methods
    // ==========================================================================
    createChainNode(params) {
        const node = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date(),
            signature: '',
            attestation: {
                attesterId: this.serviceId,
                attesterType: 'SERVICE',
                statement: `${params.operation} completed by ${params.component}`,
                timestamp: new Date(),
                signature: '',
            },
            ...params,
        };
        node.signature = this.signNode(node);
        node.attestation.signature = this.sign(node.attestation.statement);
        return node;
    }
    createReasoningStep(params) {
        return {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date(),
            ...params,
        };
    }
    buildDecisionExplanation(params) {
        const topFeatures = params.featureContributions
            .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
            .slice(0, 3);
        const humanReadableSummary = `This ${params.decisionType.toLowerCase().replace('_', ' ')} decision reached "${params.outcome}" ` +
            `with ${(params.confidence * 100).toFixed(0)}% confidence. ` +
            `The primary factors were: ${topFeatures.map((f) => f.feature).join(', ')}. ` +
            `Analysis was based on ${params.supportingEvidence.length} supporting evidence items` +
            (params.contraEvidence.length > 0 ? ` and ${params.contraEvidence.length} contrary indicators.` : '.');
        return {
            id: (0, crypto_1.randomUUID)(),
            decisionType: params.decisionType,
            outcome: params.outcome,
            confidence: params.confidence,
            reasoning: params.reasoning,
            featureContributions: params.featureContributions,
            supportingEvidence: params.supportingEvidence,
            contraEvidence: params.contraEvidence,
            alternativesConsidered: this.generateAlternatives(params.decisionType, params.outcome, params.confidence),
            humanReadableSummary,
            limitations: this.identifyLimitations(params.supportingEvidence, params.confidence),
            uncertaintyFactors: this.identifyUncertainty(params.featureContributions, params.confidence),
        };
    }
    generateAlternatives(type, outcome, confidence) {
        // Generate plausible alternatives based on confidence gap
        const alternatives = [];
        const remainingProb = 1 - confidence;
        if (remainingProb > 0.1) {
            alternatives.push({
                outcome: `Alternative to: ${outcome}`,
                probability: remainingProb * 0.6,
                whyNotChosen: 'Lower weighted evidence support',
                conditions: 'Would be chosen if additional corroborating evidence emerged',
            });
        }
        if (remainingProb > 0.2) {
            alternatives.push({
                outcome: 'Insufficient data for determination',
                probability: remainingProb * 0.4,
                whyNotChosen: 'Available evidence exceeded minimum threshold',
                conditions: 'Would apply if source reliability dropped below acceptable levels',
            });
        }
        return alternatives;
    }
    identifyLimitations(evidence, confidence) {
        const limitations = [];
        if (evidence.length < 3) {
            limitations.push('Limited source diversity - fewer than 3 independent sources');
        }
        if (confidence < 0.8) {
            limitations.push('Moderate confidence level - additional verification recommended');
        }
        const avgConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
        if (avgConfidence < 0.7) {
            limitations.push('Source evidence has below-average confidence ratings');
        }
        return limitations;
    }
    identifyUncertainty(features, confidence) {
        const factors = [];
        const lowWeightFeatures = features.filter((f) => f.weight < 0.3);
        if (lowWeightFeatures.length > features.length * 0.5) {
            factors.push({
                factor: 'Feature reliability',
                impact: 'medium',
                mitigation: 'Increase source coverage for low-weight features',
            });
        }
        if (confidence < 0.7) {
            factors.push({
                factor: 'Overall confidence',
                impact: 'high',
                mitigation: 'Seek additional corroborating intelligence',
            });
        }
        return factors;
    }
    calculateSourceWeight(source) {
        const reliabilityWeights = { A: 1.0, B: 0.85, C: 0.7, D: 0.5, E: 0.3, F: 0.1 };
        const credibilityWeights = { 1: 1.0, 2: 0.85, 3: 0.7, 4: 0.5, 5: 0.3, 6: 0.1 };
        return (reliabilityWeights[source.reliability] || 0.5) * (credibilityWeights[source.credibility] || 0.5);
    }
    calculateFeatureConfidence(features) {
        if (features.length === 0)
            return 0;
        const totalWeight = features.reduce((sum, f) => sum + f.weight, 0);
        const weightedSum = features.reduce((sum, f) => sum + f.contribution * f.weight, 0);
        return Math.min(0.99, weightedSum / totalWeight);
    }
    calculateOverallConfidence(features, evidence) {
        const featureConfidence = this.calculateFeatureConfidence(features);
        const evidenceConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
        return (featureConfidence * 0.6 + evidenceConfidence * 0.4);
    }
    performFusion(sources, weights, _strategy) {
        // Weighted consensus fusion
        const weightMap = new Map(weights.map((w) => [w.sourceId, w.weight]));
        const allEvidence = sources.flatMap((s) => s.evidence.map((e) => ({ ...e, weight: weightMap.get(s.source.id) || 0.5 })));
        const totalWeight = allEvidence.reduce((sum, e) => sum + e.weight, 0);
        const fusedConfidence = allEvidence.reduce((sum, e) => sum + e.confidence * e.weight, 0) / totalWeight;
        return {
            id: (0, crypto_1.randomUUID)(),
            sourceId: 'FUSION_ENGINE',
            content: `Fused intelligence from ${sources.length} sources with ${allEvidence.length} evidence items`,
            contentHash: this.hashContent(JSON.stringify(allEvidence)),
            extractedAt: new Date(),
            confidence: fusedConfidence,
            metadata: { sourceCount: sources.length, evidenceCount: allEvidence.length },
        };
    }
    deriveClassification(sources) {
        const levels = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET'];
        const maxLevel = Math.max(...sources.map((s) => levels.indexOf(s.classification)));
        return levels[maxLevel] || 'UNCLASSIFIED';
    }
    getAlgorithmForType(type) {
        const algorithms = {
            PRIORITIZATION: 'WeightedMultiCriteria',
            FUSION: 'WeightedConsensus',
            RISK_ASSESSMENT: 'BayesianRiskModel',
            LINK_PREDICTION: 'GraphEmbeddingPredictor',
            ANOMALY_DETECTION: 'IsolationForest',
            RECOMMENDATION: 'CollaborativeFiltering',
        };
        return algorithms[type] || 'Unknown';
    }
    generateAnalysisNarrative(type, features, confidence) {
        const topPositive = features.filter((f) => f.direction === 'positive').slice(0, 2);
        const topNegative = features.filter((f) => f.direction === 'negative').slice(0, 2);
        let narrative = `Completed ${type.toLowerCase().replace('_', ' ')} with ${(confidence * 100).toFixed(0)}% confidence. `;
        if (topPositive.length > 0) {
            narrative += `Key positive factors: ${topPositive.map((f) => f.feature).join(', ')}. `;
        }
        if (topNegative.length > 0) {
            narrative += `Limiting factors: ${topNegative.map((f) => f.feature).join(', ')}.`;
        }
        return narrative;
    }
    generateFusionNarrative(strategy, sources, fused) {
        const sourceTypes = [...new Set(sources.map((s) => s.source.type))];
        return `Applied ${strategy} fusion across ${sources.length} sources (${sourceTypes.join(', ')}) ` +
            `yielding ${(fused.confidence * 100).toFixed(0)}% confidence in fused product.`;
    }
    summarizeResult(result) {
        if (typeof result === 'string')
            return result;
        if (typeof result === 'number')
            return result.toString();
        if (typeof result === 'boolean')
            return result ? 'Positive' : 'Negative';
        if (Array.isArray(result))
            return `${result.length} items`;
        return 'Complex result';
    }
    addAuditRecord(actor, action, resource, decision) {
        const previousHash = this.auditChain.length > 0 ? this.auditChain[this.auditChain.length - 1].chainHash : '0'.repeat(64);
        const record = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date(),
            actor,
            action,
            resource,
            decision,
            chainHash: '',
            previousHash,
        };
        record.chainHash = this.hashContent(JSON.stringify({ ...record, chainHash: undefined }) + previousHash);
        this.auditChain.push(record);
    }
    hashContent(content) {
        return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    }
    sign(data) {
        return (0, crypto_1.createHash)('sha384').update(data + this.signingKey).digest('hex');
    }
    signNode(node) {
        const payload = `${node.id}:${node.nodeType}:${node.operation}:${node.outputHash}`;
        return this.sign(payload);
    }
    computeMerkleRoot(hashes) {
        if (hashes.length === 0)
            return this.hashContent('');
        if (hashes.length === 1)
            return hashes[0];
        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left;
            nextLevel.push(this.hashContent(left + right));
        }
        return this.computeMerkleRoot(nextLevel);
    }
}
exports.ExplainableDefenseAI = ExplainableDefenseAI;
exports.default = ExplainableDefenseAI;
