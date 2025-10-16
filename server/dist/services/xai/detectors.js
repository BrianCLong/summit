/**
 * IntelGraph GA-Core Detector Services
 * Committee Requirements: Pattern detection, anomaly detection, threat detection
 * Integrates with Graph-XAI for explainable detection results
 */
import crypto from 'crypto';
import { insertEvent, queryTemporalPatterns } from '../../db/timescale.js';
import { insertAnalyticsTrace } from '../../db/timescale.js';
import GraphXAIExplainer from './graph-explainer.js';
import logger from '../../utils/logger.js';
export class DetectorService {
    static instance;
    xaiExplainer;
    static getInstance() {
        if (!DetectorService.instance) {
            DetectorService.instance = new DetectorService();
        }
        return DetectorService.instance;
    }
    constructor() {
        this.xaiExplainer = GraphXAIExplainer.getInstance();
    }
    // Main detection orchestrator
    async runDetectors(request) {
        const startTime = Date.now();
        const traceId = crypto.randomUUID();
        logger.info({
            message: 'Starting detection run',
            trace_id: traceId,
            detection_types: request.detection_types,
            sensitivity_level: request.sensitivity_level,
            data_source: request.data_source,
        });
        const allDetections = [];
        try {
            // Run each requested detection type
            for (const detectionType of request.detection_types) {
                const detections = await this.runDetectionByType(detectionType, request, traceId);
                allDetections.push(...detections);
            }
            // Generate XAI explanations for high-confidence detections
            await this.addExplanationsToDetections(allDetections, request);
            // Create summary
            const processingTime = Date.now() - startTime;
            const summary = this.createDetectionSummary(allDetections, processingTime);
            // Record analytics trace
            await insertAnalyticsTrace({
                trace_id: traceId,
                operation_type: 'detector_run',
                duration_ms: processingTime,
                input_hash: this.hashDetectionRequest(request),
                performance_metrics: {
                    total_detections: summary.total_detections,
                    detection_types: request.detection_types,
                    processing_time_ms: processingTime,
                },
            });
            // Record significant detections as events
            await this.recordDetectionEvents(allDetections, request);
            logger.info({
                message: 'Detection run completed',
                trace_id: traceId,
                total_detections: summary.total_detections,
                high_priority_count: summary.high_priority_detections.length,
                processing_time_ms: processingTime,
            });
            return summary;
        }
        catch (error) {
            logger.error({
                message: 'Detection run failed',
                trace_id: traceId,
                error: error instanceof Error ? error.message : String(error),
                data_source: request.data_source,
            });
            throw new Error(`Detection run failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Individual detection type handlers
    async runDetectionByType(type, request, traceId) {
        const detectionStartTime = Date.now();
        let detections = [];
        try {
            switch (type) {
                case 'anomaly_detection':
                    detections = await this.detectAnomalies(request);
                    break;
                case 'pattern_matching':
                    detections = await this.detectPatterns(request);
                    break;
                case 'threat_detection':
                    detections = await this.detectThreats(request);
                    break;
                case 'behavioral_analysis':
                    detections = await this.analyzeBehavior(request);
                    break;
                case 'temporal_clustering':
                    detections = await this.detectTemporalClusters(request);
                    break;
                case 'network_analysis':
                    detections = await this.analyzeNetworkStructure(request);
                    break;
                default:
                    logger.warn({
                        message: 'Unknown detection type',
                        detection_type: type,
                        trace_id: traceId,
                    });
            }
            const detectionTime = Date.now() - detectionStartTime;
            logger.info({
                message: `${type} detection completed`,
                trace_id: traceId,
                detection_count: detections.length,
                processing_time_ms: detectionTime,
            });
        }
        catch (error) {
            logger.error({
                message: `${type} detection failed`,
                trace_id: traceId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
        return detections;
    }
    // Anomaly Detection
    async detectAnomalies(request) {
        const detections = [];
        const nodes = request.graph_data?.nodes || [];
        // Statistical anomaly detection
        const degreeDistribution = this.calculateDegreeDistribution(request.graph_data);
        const threshold = this.calculateAnomalyThreshold(degreeDistribution, request.sensitivity_level);
        for (const node of nodes) {
            const degree = this.calculateNodeDegree(node.id, request.graph_data);
            if (degree > threshold) {
                detections.push({
                    detection_id: crypto.randomUUID(),
                    detection_type: 'anomaly_detection',
                    confidence: this.calculateAnomalyConfidence(degree, threshold),
                    severity: degree > threshold * 2 ? 'HIGH' : 'MEDIUM',
                    description: `Node ${node.id} exhibits anomalous connectivity patterns`,
                    affected_entities: [node.id],
                    evidence: [
                        {
                            evidence_type: 'statistical_anomaly',
                            evidence_data: {
                                degree,
                                threshold,
                                z_score: (degree - threshold) / Math.sqrt(threshold),
                            },
                            confidence: 0.85,
                            source: 'degree_distribution_analysis',
                        },
                    ],
                    recommendations: [
                        'Investigate node connections and activity patterns',
                        'Verify data integrity for this entity',
                        'Consider temporal analysis for activity spikes',
                    ],
                    created_at: new Date(),
                });
            }
        }
        return detections;
    }
    // Pattern Detection
    async detectPatterns(request) {
        const detections = [];
        // Known threat patterns
        const threatPatterns = [
            {
                pattern: 'hub_and_spoke',
                description: 'Central node with many connections',
                min_degree: 10,
            },
            {
                pattern: 'clique_formation',
                description: 'Dense interconnected group',
                min_density: 0.8,
            },
            {
                pattern: 'bridge_node',
                description: 'Node connecting separate clusters',
                betweenness_threshold: 0.5,
            },
        ];
        for (const pattern of threatPatterns) {
            const matches = await this.findPatternMatches(pattern, request.graph_data);
            for (const match of matches) {
                detections.push({
                    detection_id: crypto.randomUUID(),
                    detection_type: 'pattern_matching',
                    confidence: match.confidence,
                    severity: match.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
                    description: `Detected ${pattern.description} pattern`,
                    affected_entities: match.entities,
                    evidence: [
                        {
                            evidence_type: 'pattern_match',
                            evidence_data: {
                                pattern: pattern.pattern,
                                match_score: match.confidence,
                            },
                            confidence: match.confidence,
                            source: 'pattern_matcher',
                        },
                    ],
                    recommendations: [
                        `Analyze ${pattern.pattern} structure for operational security`,
                        'Cross-reference with known threat intelligence',
                        'Monitor for temporal changes in pattern',
                    ],
                    created_at: new Date(),
                });
            }
        }
        return detections;
    }
    // Threat Detection
    async detectThreats(request) {
        const detections = [];
        // Threat indicators
        const threatIndicators = [
            'rapid_expansion',
            'covert_communication',
            'resource_hoarding',
            'operational_security',
            'counter_surveillance',
        ];
        for (const indicator of threatIndicators) {
            const threats = await this.assessThreatIndicator(indicator, request.graph_data, request.context);
            detections.push(...threats);
        }
        return detections;
    }
    // Behavioral Analysis
    async analyzeBehavior(request) {
        const detections = [];
        if (!request.time_window) {
            return detections; // Behavioral analysis requires time window
        }
        // Analyze behavioral changes over time
        const entities = (request.graph_data?.nodes || []).map((n) => n.id);
        for (const entityId of entities.slice(0, 20)) {
            // Limit for performance
            try {
                const patterns = await queryTemporalPatterns(entityId, request.time_window);
                if (patterns.rows.length > 0) {
                    const behaviorChange = this.detectBehaviorChange(patterns.rows);
                    if (behaviorChange.significant) {
                        detections.push({
                            detection_id: crypto.randomUUID(),
                            detection_type: 'behavioral_analysis',
                            confidence: behaviorChange.confidence,
                            severity: behaviorChange.confidence > 0.7 ? 'HIGH' : 'MEDIUM',
                            description: `Significant behavioral change detected for ${entityId}`,
                            affected_entities: [entityId],
                            evidence: [
                                {
                                    evidence_type: 'behavioral_change',
                                    evidence_data: behaviorChange.metrics,
                                    confidence: behaviorChange.confidence,
                                    source: 'temporal_behavior_analyzer',
                                },
                            ],
                            recommendations: [
                                'Review activity timeline for triggering events',
                                'Compare with baseline behavioral patterns',
                                'Investigate external factors influencing change',
                            ],
                            created_at: new Date(),
                        });
                    }
                }
            }
            catch (error) {
                logger.debug({
                    message: 'Behavioral analysis failed for entity',
                    entity_id: entityId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return detections;
    }
    // Temporal Clustering
    async detectTemporalClusters(request) {
        const detections = [];
        // Implement temporal clustering logic
        const clusters = this.identifyTemporalClusters(request.graph_data, request.time_window);
        for (const cluster of clusters) {
            if (cluster.significance > 0.6) {
                detections.push({
                    detection_id: crypto.randomUUID(),
                    detection_type: 'temporal_clustering',
                    confidence: cluster.significance,
                    severity: cluster.significance > 0.8 ? 'HIGH' : 'MEDIUM',
                    description: `Temporal activity cluster detected: ${cluster.description}`,
                    affected_entities: cluster.entities,
                    evidence: [
                        {
                            evidence_type: 'temporal_cluster',
                            evidence_data: cluster.metrics,
                            confidence: cluster.significance,
                            source: 'temporal_clustering_engine',
                        },
                    ],
                    recommendations: [
                        'Analyze cluster timeline for coordinated activity',
                        'Identify potential triggering events',
                        'Cross-reference with external intelligence',
                    ],
                    created_at: new Date(),
                    expires_at: cluster.expires_at,
                });
            }
        }
        return detections;
    }
    // Network Analysis
    async analyzeNetworkStructure(request) {
        const detections = [];
        // Network topology analysis
        const networkMetrics = this.calculateNetworkMetrics(request.graph_data);
        // Detect structural vulnerabilities
        if (networkMetrics.clustering_coefficient < 0.2) {
            detections.push({
                detection_id: crypto.randomUUID(),
                detection_type: 'network_analysis',
                confidence: 0.8,
                severity: 'MEDIUM',
                description: 'Low network clustering suggests vulnerability to disruption',
                affected_entities: [], // Network-wide
                evidence: [
                    {
                        evidence_type: 'network_topology',
                        evidence_data: networkMetrics,
                        confidence: 0.8,
                        source: 'network_topology_analyzer',
                    },
                ],
                recommendations: [
                    'Identify critical bridging nodes',
                    'Assess network resilience to node removal',
                    'Consider redundancy improvements',
                ],
                created_at: new Date(),
            });
        }
        return detections;
    }
    // XAI Integration - Committee requirement
    async addExplanationsToDetections(detections, request) {
        const highConfidenceDetections = detections.filter((d) => d.confidence > 0.7);
        for (const detection of highConfidenceDetections) {
            try {
                const explanation = await this.xaiExplainer.generateExplanation({
                    query: `Explain detection: ${detection.description}`,
                    graph_data: request.graph_data,
                    explanation_type: 'subgraph_reasoning',
                    context: {
                        detection_type: detection.detection_type,
                        affected_entities: detection.affected_entities,
                    },
                });
                detection.explanation = {
                    explanation_id: explanation.explanation_id,
                    confidence: explanation.confidence,
                    key_explanations: explanation.explanations.slice(0, 3), // Top 3
                    model_version: explanation.model_version,
                };
            }
            catch (error) {
                logger.warn({
                    message: 'Failed to generate XAI explanation for detection',
                    detection_id: detection.detection_id,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    // Helper methods
    calculateNodeDegree(nodeId, graphData) {
        const edges = graphData.edges || [];
        return edges.filter((e) => e.source === nodeId || e.target === nodeId)
            .length;
    }
    calculateDegreeDistribution(graphData) {
        const nodes = graphData.nodes || [];
        return nodes.map((node) => this.calculateNodeDegree(node.id, graphData));
    }
    calculateAnomalyThreshold(distribution, sensitivity) {
        const mean = distribution.reduce((sum, val) => sum + val, 0) / distribution.length;
        const variance = distribution.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            distribution.length;
        const stdDev = Math.sqrt(variance);
        // Adjust threshold based on sensitivity (0.1 = very sensitive, 0.9 = less sensitive)
        const zScore = 2 + (1 - sensitivity) * 2; // Range: 2-4 standard deviations
        return mean + zScore * stdDev;
    }
    calculateAnomalyConfidence(value, threshold) {
        const excess = value - threshold;
        return Math.min(0.5 + (excess / threshold) * 0.4, 0.95);
    }
    async findPatternMatches(pattern, graphData) {
        // Simplified pattern matching - would implement actual graph pattern matching
        const matches = [];
        if (pattern.pattern === 'hub_and_spoke') {
            const nodes = graphData.nodes || [];
            for (const node of nodes) {
                const degree = this.calculateNodeDegree(node.id, graphData);
                if (degree >= pattern.min_degree) {
                    matches.push({
                        entities: [node.id],
                        confidence: Math.min(degree / pattern.min_degree, 1.0),
                    });
                }
            }
        }
        return matches;
    }
    async assessThreatIndicator(indicator, graphData, context) {
        // Simplified threat assessment
        return []; // Would implement specific threat detection logic
    }
    detectBehaviorChange(patternData) {
        // Simplified behavioral change detection
        return {
            significant: patternData.length > 5,
            confidence: 0.75,
            metrics: { pattern_count: patternData.length },
        };
    }
    identifyTemporalClusters(graphData, timeWindow) {
        // Simplified temporal clustering
        return [
            {
                significance: 0.7,
                description: 'coordinated activity burst',
                entities: ['entity1', 'entity2'],
                metrics: { activity_spike: 0.8 },
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        ];
    }
    calculateNetworkMetrics(graphData) {
        const nodes = graphData.nodes || [];
        const edges = graphData.edges || [];
        return {
            node_count: nodes.length,
            edge_count: edges.length,
            density: nodes.length > 1
                ? (2 * edges.length) / (nodes.length * (nodes.length - 1))
                : 0,
            clustering_coefficient: 0.3, // Simplified calculation
        };
    }
    createDetectionSummary(detections, processingTimeMs) {
        const byType = {};
        const bySeverity = {};
        for (const detection of detections) {
            byType[detection.detection_type] =
                (byType[detection.detection_type] || 0) + 1;
            bySeverity[detection.severity] =
                (bySeverity[detection.severity] || 0) + 1;
        }
        return {
            total_detections: detections.length,
            by_type: byType,
            by_severity: bySeverity,
            high_priority_detections: detections.filter((d) => d.severity === 'HIGH' || d.severity === 'CRITICAL'),
            processing_time_ms: processingTimeMs,
        };
    }
    async recordDetectionEvents(detections, request) {
        for (const detection of detections) {
            if (detection.severity === 'HIGH' || detection.severity === 'CRITICAL') {
                try {
                    await insertEvent({
                        event_type: 'DETECTION_ALERT',
                        event_source: 'detector_service',
                        entity_id: detection.affected_entities[0] || 'unknown',
                        entity_type: detection.detection_type,
                        metadata: {
                            detection_id: detection.detection_id,
                            confidence: detection.confidence,
                            severity: detection.severity,
                            description: detection.description,
                        },
                        confidence: detection.confidence,
                        severity: detection.severity,
                    });
                }
                catch (error) {
                    logger.error({
                        message: 'Failed to record detection event',
                        detection_id: detection.detection_id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
    }
    hashDetectionRequest(request) {
        const normalized = {
            data_source: request.data_source,
            detection_types: request.detection_types.sort(),
            sensitivity_level: request.sensitivity_level,
            graph_hash: this.calculateGraphHash(request.graph_data),
        };
        return crypto
            .createHash('md5')
            .update(JSON.stringify(normalized))
            .digest('hex');
    }
    calculateGraphHash(graphData) {
        if (!graphData)
            return 'empty';
        const nodeCount = (graphData.nodes || []).length;
        const edgeCount = (graphData.edges || []).length;
        return `nodes:${nodeCount}-edges:${edgeCount}`;
    }
}
export default DetectorService;
//# sourceMappingURL=detectors.js.map