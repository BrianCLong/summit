"use strict";
/**
 * Multi-Modal Threat Fusion Engine
 *
 * Fuses signals from multiple detection modalities:
 * - Social media analysis
 * - Cyber threat intelligence
 * - Physical security reports
 * - Open source intelligence
 * - Law enforcement feeds
 * - Platform transparency reports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiModalFusionEngine = void 0;
class MultiModalFusionEngine {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Fuse threats from multiple detection systems
     */
    async fuse(threatSets) {
        const allThreats = threatSets.flat();
        // Group by potential correlation
        const correlationGroups = this.groupByCorrelation(allThreats);
        // Fuse correlated threats
        const fusedThreats = [];
        for (const group of correlationGroups) {
            if (group.length === 1) {
                // Single-modality threat
                fusedThreats.push(this.wrapSingleThreat(group[0]));
            }
            else {
                // Multi-modality fusion
                fusedThreats.push(this.fuseGroup(group));
            }
        }
        return fusedThreats;
    }
    groupByCorrelation(threats) {
        const groups = [];
        const assigned = new Set();
        for (const threat of threats) {
            if (assigned.has(threat.id)) {
                continue;
            }
            const group = [threat];
            assigned.add(threat.id);
            // Find correlated threats
            for (const other of threats) {
                if (assigned.has(other.id)) {
                    continue;
                }
                if (this.areCorrelated(threat, other)) {
                    group.push(other);
                    assigned.add(other.id);
                }
            }
            groups.push(group);
        }
        return groups;
    }
    areCorrelated(a, b) {
        // Temporal correlation
        const temporalDiff = Math.abs(a.temporalContext.timeWindow.start.getTime() -
            b.temporalContext.timeWindow.start.getTime());
        if (temporalDiff > this.config.temporalWindow) {
            return false;
        }
        // Spatial correlation
        const spatialOverlap = this.calculateSpatialOverlap(a.geospatialContext.jurisdictions, b.geospatialContext.jurisdictions);
        if (spatialOverlap === 0) {
            return false;
        }
        // Type correlation
        if (a.type === b.type) {
            return true;
        }
        // Related types
        const relatedTypes = {
            DISINFORMATION_CAMPAIGN: ['PERCEPTION_HACK', 'LEGITIMACY_ATTACK'],
            FOREIGN_INTERFERENCE: ['DISINFORMATION_CAMPAIGN', 'INFRASTRUCTURE_ATTACK'],
            VOTER_SUPPRESSION: ['COORDINATED_HARASSMENT', 'DISINFORMATION_CAMPAIGN'],
        };
        return relatedTypes[a.type]?.includes(b.type) || false;
    }
    calculateSpatialOverlap(a, b) {
        const setA = new Set(a);
        const intersection = b.filter((x) => setA.has(x));
        const union = new Set([...a, ...b]);
        return intersection.length / union.size;
    }
    wrapSingleThreat(threat) {
        return {
            ...threat,
            fusionScore: threat.confidence,
            contributingModalities: [this.getModality(threat)],
            correlationStrength: 1,
            crossModalEvidence: [],
        };
    }
    fuseGroup(threats) {
        // Calculate fused confidence (Dempster-Shafer-inspired)
        const fusedConfidence = this.fuseConfidences(threats.map((t) => t.confidence));
        // Determine primary threat type
        const primaryType = this.selectPrimaryType(threats);
        // Merge evidence
        const allEvidence = threats.flatMap((t) => t.evidence);
        // Calculate cross-modal correlations
        const crossModal = this.calculateCrossModalEvidence(threats);
        return {
            id: crypto.randomUUID(),
            type: primaryType,
            confidence: fusedConfidence,
            severity: this.fuseSeverity(threats),
            vectors: [...new Set(threats.flatMap((t) => t.vectors))],
            temporalContext: threats[0].temporalContext, // Use first as reference
            geospatialContext: this.fuseGeospatial(threats),
            attribution: this.fuseAttribution(threats),
            evidence: allEvidence,
            mitigationRecommendations: this.fuseMitigations(threats),
            fusionScore: fusedConfidence,
            contributingModalities: [...new Set(threats.map((t) => this.getModality(t)))],
            correlationStrength: this.calculateCorrelationStrength(threats),
            crossModalEvidence: crossModal,
        };
    }
    fuseConfidences(confidences) {
        // Combine using independence assumption
        let combined = confidences[0];
        for (let i = 1; i < confidences.length; i++) {
            combined = combined + confidences[i] - combined * confidences[i];
        }
        return Math.min(0.99, combined);
    }
    selectPrimaryType(threats) {
        // Select highest severity/confidence type
        return threats.sort((a, b) => b.confidence - a.confidence)[0].type;
    }
    fuseSeverity(threats) {
        const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
        const highest = threats.reduce((max, t) => {
            const maxIdx = severityOrder.indexOf(max);
            const tIdx = severityOrder.indexOf(t.severity);
            return tIdx < maxIdx ? t.severity : max;
        }, 'INFORMATIONAL');
        return highest;
    }
    fuseGeospatial(threats) {
        return {
            jurisdictions: [...new Set(threats.flatMap((t) => t.geospatialContext.jurisdictions))],
            precincts: [...new Set(threats.flatMap((t) => t.geospatialContext.precincts))],
            swingIndicator: Math.max(...threats.map((t) => t.geospatialContext.swingIndicator)),
            demographicOverlays: threats.flatMap((t) => t.geospatialContext.demographicOverlays),
            infrastructureDependencies: [
                ...new Set(threats.flatMap((t) => t.geospatialContext.infrastructureDependencies)),
            ],
        };
    }
    fuseAttribution(threats) {
        // Use highest confidence attribution
        return threats.sort((a, b) => b.attribution.confidence - a.attribution.confidence)[0].attribution;
    }
    fuseMitigations(threats) {
        const all = threats.flatMap((t) => t.mitigationRecommendations);
        // Deduplicate by action
        const seen = new Set();
        return all.filter((m) => {
            if (seen.has(m.action)) {
                return false;
            }
            seen.add(m.action);
            return true;
        });
    }
    getModality(threat) {
        return threat.vectors[0] || 'UNKNOWN';
    }
    calculateCrossModalEvidence(threats) {
        const crossModal = [];
        for (let i = 0; i < threats.length; i++) {
            for (let j = i + 1; j < threats.length; j++) {
                crossModal.push({
                    modality1: this.getModality(threats[i]),
                    modality2: this.getModality(threats[j]),
                    correlationType: 'TEMPORAL_SPATIAL',
                    strength: 0.8,
                    temporalAlignment: 0.9,
                });
            }
        }
        return crossModal;
    }
    calculateCorrelationStrength(threats) {
        return Math.min(1, 0.5 + threats.length * 0.1);
    }
}
exports.MultiModalFusionEngine = MultiModalFusionEngine;
