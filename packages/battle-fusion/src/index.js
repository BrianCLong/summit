"use strict";
/**
 * @intelgraph/battle-fusion
 * Multidomain Data Fusion Engine for Battle Management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionEngine = void 0;
exports.normalizeSensorReading = normalizeSensorReading;
exports.normalizeSatelliteImagery = normalizeSatelliteImagery;
exports.normalizeCommsIntercept = normalizeCommsIntercept;
exports.normalizeCyberEvent = normalizeCyberEvent;
// Re-export types
__exportStar(require("@intelgraph/battle-types"), exports);
const DEFAULT_CONFIG = {
    conflictResolution: 'HIGHEST_CONFIDENCE',
    correlationThreshold: 0.7,
    maxEntityAge: 300000, // 5 minutes
    enablePrediction: true,
};
const DOMAIN_WEIGHTS_DEFAULT = {
    SENSOR_GRID: 0.15,
    SATELLITE: 0.15,
    COMMS: 0.10,
    CYBER: 0.08,
    HUMINT: 0.12,
    SIGINT: 0.12,
    IMINT: 0.10,
    GEOINT: 0.08,
    OSINT: 0.04,
    ELINT: 0.03,
    MASINT: 0.02,
    EXTERNAL: 0.01,
};
const RELIABILITY_SCORES_DEFAULT = {
    A: 1.0,
    B: 0.8,
    C: 0.6,
    D: 0.4,
    E: 0.2,
    F: 0.0,
};
const CREDIBILITY_SCORES_DEFAULT = {
    1: 1.0,
    2: 0.8,
    3: 0.6,
    4: 0.4,
    5: 0.2,
    6: 0.0,
};
class FusionEngine {
    config;
    entityCache = new Map();
    sourceRegistry = new Map();
    pendingEvents = [];
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Register a data source with reliability/credibility ratings
     */
    registerSource(source) {
        this.sourceRegistry.set(source.id, source);
    }
    /**
     * Ingest normalized event and queue for fusion
     */
    ingestEvent(event) {
        this.pendingEvents.push(event);
    }
    /**
     * Execute fusion cycle on pending events
     */
    async executeFusion() {
        const startTime = Date.now();
        const events = this.pendingEvents.splice(0);
        // Group events by potential entity
        const entityGroups = this.groupEventsByEntity(events);
        // Fuse each entity group
        const fusedEntities = [];
        for (const [entityKey, groupEvents] of entityGroups) {
            const fused = this.fuseEntityGroup(entityKey, groupEvents);
            if (fused) {
                fusedEntities.push(fused);
                this.entityCache.set(fused.canonicalId, fused);
            }
        }
        // Find correlations between entities
        const correlations = this.findCorrelations(fusedEntities);
        // Generate situational picture
        const situationalPicture = this.generateSituationalPicture(fusedEntities);
        // Calculate fusion metadata
        const domainCoverage = [...new Set(events.map((e) => e.domain))];
        return {
            fusionId: `fusion-${Date.now()}`,
            timestamp: new Date(),
            entities: fusedEntities,
            correlations,
            situationalPicture,
            confidence: this.calculateOverallConfidence(fusedEntities),
            sourceCount: events.length,
            domainCoverage,
        };
    }
    /**
     * Group events by their likely entity match
     */
    groupEventsByEntity(events) {
        const groups = new Map();
        for (const event of events) {
            const key = this.computeEntityKey(event);
            const group = groups.get(key) || [];
            group.push(event);
            groups.set(key, group);
        }
        return groups;
    }
    /**
     * Compute a grouping key for entity matching
     */
    computeEntityKey(event) {
        // Use entity ID if available
        if (event.entityId) {
            return event.entityId;
        }
        // Otherwise use location-based clustering
        if (event.location) {
            const gridX = Math.floor(event.location.latitude * 100);
            const gridY = Math.floor(event.location.longitude * 100);
            return `loc-${gridX}-${gridY}-${event.entityType}`;
        }
        return `unknown-${event.eventId}`;
    }
    /**
     * Fuse a group of events into a single entity
     */
    fuseEntityGroup(entityKey, events) {
        if (events.length === 0)
            return null;
        // Get existing entity if any
        const existing = this.entityCache.get(entityKey);
        // Calculate weighted contributions from each source
        const contributions = events.map((event) => ({
            sourceId: event.sourceId,
            domain: event.domain,
            weight: this.calculateSourceWeight(event),
            confidence: event.confidence,
            timestamp: event.timestamp,
        }));
        // Merge data fields with conflict resolution
        const mergedData = this.mergeEntityData(events, contributions);
        const conflicts = this.detectConflicts(events);
        // Build battlefield entity
        const entity = this.buildBattlefieldEntity(entityKey, mergedData, events);
        // Calculate fusion score
        const fusionScore = this.calculateFusionScore(contributions);
        return {
            id: `fused-${entityKey}`,
            canonicalId: entityKey,
            entity,
            fusionScore,
            contributingSources: contributions,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
            lastFused: new Date(),
        };
    }
    /**
     * Calculate source weight based on domain and reliability
     */
    calculateSourceWeight(event) {
        const domainWeight = this.config.domainWeights?.[event.domain] ??
            DOMAIN_WEIGHTS_DEFAULT[event.domain] ??
            0.05;
        const source = this.sourceRegistry.get(event.sourceId);
        if (!source) {
            return domainWeight * event.confidence;
        }
        const reliabilityScore = RELIABILITY_SCORES_DEFAULT[source.reliability] ?? 0.5;
        const credibilityScore = CREDIBILITY_SCORES_DEFAULT[source.credibility] ?? 0.5;
        return domainWeight * reliabilityScore * credibilityScore * event.confidence;
    }
    /**
     * Merge entity data from multiple sources
     */
    mergeEntityData(events, contributions) {
        const merged = {};
        const fieldWeights = {};
        // Collect all field values with their weights
        for (let i = 0; i < events.length; i++) {
            const event = events[i];
            const weight = contributions[i].weight;
            for (const [field, value] of Object.entries(event.data)) {
                if (!fieldWeights[field]) {
                    fieldWeights[field] = [];
                }
                fieldWeights[field].push({ value, weight });
            }
        }
        // Resolve each field based on config
        for (const [field, values] of Object.entries(fieldWeights)) {
            merged[field] = this.resolveFieldValue(values);
        }
        return merged;
    }
    /**
     * Resolve field value based on conflict resolution strategy
     */
    resolveFieldValue(values) {
        if (values.length === 0)
            return undefined;
        if (values.length === 1)
            return values[0].value;
        switch (this.config.conflictResolution) {
            case 'HIGHEST_CONFIDENCE':
                return values.reduce((a, b) => (a.weight > b.weight ? a : b)).value;
            case 'WEIGHTED_AVERAGE':
                // Only works for numeric values
                if (typeof values[0].value === 'number') {
                    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
                    return (values.reduce((sum, v) => sum + v.value * v.weight, 0) / totalWeight);
                }
                return values.reduce((a, b) => (a.weight > b.weight ? a : b)).value;
            case 'MOST_RECENT':
            default:
                return values[values.length - 1].value;
        }
    }
    /**
     * Detect conflicts between event data
     */
    detectConflicts(events) {
        const conflicts = [];
        const fieldValues = {};
        for (const event of events) {
            for (const [field, value] of Object.entries(event.data)) {
                if (!fieldValues[field]) {
                    fieldValues[field] = [];
                }
                fieldValues[field].push({
                    value,
                    sourceId: event.sourceId,
                    confidence: event.confidence,
                });
            }
        }
        for (const [field, values] of Object.entries(fieldValues)) {
            const uniqueValues = new Set(values.map((v) => JSON.stringify(v.value)));
            if (uniqueValues.size > 1) {
                conflicts.push({
                    field,
                    values,
                    resolution: {
                        selectedValue: this.resolveFieldValue(values.map((v) => ({ value: v.value, weight: v.confidence }))),
                        method: this.config.conflictResolution || 'HIGHEST_CONFIDENCE',
                    },
                });
            }
        }
        return conflicts;
    }
    /**
     * Build a battlefield entity from merged data
     */
    buildBattlefieldEntity(entityKey, data, events) {
        // Get most recent location
        const latestWithLocation = events
            .filter((e) => e.location)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        const location = latestWithLocation?.location || {
            latitude: 0,
            longitude: 0,
        };
        return {
            id: entityKey,
            name: data.name || data.designation || entityKey,
            designation: data.designation,
            forceType: data.forceType || 'UNKNOWN',
            unitType: data.unitType || 'INFANTRY',
            status: data.status || 'UNKNOWN',
            location,
            heading: data.heading,
            speed: data.speed,
            strength: data.strength,
            confidence: this.calculateEntityConfidence(events),
            lastUpdated: new Date(Math.max(...events.map((e) => e.timestamp.getTime()))),
            sources: [...new Set(events.map((e) => e.sourceId))],
            metadata: data,
        };
    }
    /**
     * Calculate entity confidence from events
     */
    calculateEntityConfidence(events) {
        if (events.length === 0)
            return 0;
        // Weighted average confidence
        let totalWeight = 0;
        let weightedSum = 0;
        for (const event of events) {
            const weight = this.calculateSourceWeight(event);
            weightedSum += event.confidence * weight;
            totalWeight += weight;
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    /**
     * Calculate overall fusion score
     */
    calculateFusionScore(contributions) {
        if (contributions.length === 0)
            return 0;
        // Higher score for more diverse sources
        const uniqueDomains = new Set(contributions.map((c) => c.domain)).size;
        const domainDiversity = Math.min(uniqueDomains / 5, 1); // Cap at 5 domains
        // Average weighted confidence
        const totalWeight = contributions.reduce((sum, c) => sum + c.weight, 0);
        const avgConfidence = contributions.reduce((sum, c) => sum + c.confidence * c.weight, 0) /
            totalWeight;
        return (domainDiversity * 0.3 + avgConfidence * 0.7);
    }
    /**
     * Find correlations between fused entities
     */
    findCorrelations(entities) {
        const correlations = [];
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const e1 = entities[i];
                const e2 = entities[j];
                // Check spatial proximity
                const distance = this.calculateDistance(e1.entity.location, e2.entity.location);
                if (distance < 1) {
                    // Within 1km
                    correlations.push({
                        entityId1: e1.canonicalId,
                        entityId2: e2.canonicalId,
                        correlationType: 'RELATED',
                        confidence: 0.8 - distance * 0.3,
                        evidence: [`Spatial proximity: ${distance.toFixed(2)}km`],
                    });
                }
                // Check command relationships
                if (e1.entity.unitType === 'COMMAND' &&
                    e1.entity.forceType === e2.entity.forceType) {
                    correlations.push({
                        entityId1: e1.canonicalId,
                        entityId2: e2.canonicalId,
                        correlationType: 'COMMANDING',
                        confidence: 0.6,
                        evidence: ['Unit type relationship'],
                    });
                }
            }
        }
        return correlations.filter((c) => c.confidence >= (this.config.correlationThreshold || 0.7));
    }
    /**
     * Calculate distance between two locations (Haversine formula)
     */
    calculateDistance(loc1, loc2) {
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(loc2.latitude - loc1.latitude);
        const dLon = this.toRad(loc2.longitude - loc1.longitude);
        const lat1 = this.toRad(loc1.latitude);
        const lat2 = this.toRad(loc2.latitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(deg) {
        return (deg * Math.PI) / 180;
    }
    /**
     * Generate situational picture from fused entities
     */
    generateSituationalPicture(entities) {
        const blueForces = entities
            .filter((e) => e.entity.forceType === 'BLUE')
            .map((e) => e.entity);
        const redForces = entities
            .filter((e) => e.entity.forceType === 'RED')
            .map((e) => e.entity);
        const neutralForces = entities
            .filter((e) => e.entity.forceType === 'NEUTRAL')
            .map((e) => e.entity);
        const unknownContacts = entities
            .filter((e) => e.entity.forceType === 'UNKNOWN')
            .map((e) => e.entity);
        // Generate threat assessments for red forces
        const threats = redForces.map((entity) => this.assessThreat(entity, blueForces));
        return {
            timestamp: new Date(),
            areaOfInterest: this.calculateBoundingBox(entities.map((e) => e.entity)),
            blueForces,
            redForces,
            neutralForces,
            unknownContacts,
            threats,
            logisticsStatus: {
                timestamp: new Date(),
                supplyLines: [],
                depots: [],
                convoys: [],
                overallReadiness: 85,
            },
        };
    }
    /**
     * Assess threat level of an entity
     */
    assessThreat(entity, friendlyForces) {
        // Calculate threat level based on proximity and capability
        let threatLevel = 'LOW';
        const nearestFriendly = friendlyForces.reduce((nearest, friendly) => {
            const dist = this.calculateDistance(entity.location, friendly.location);
            return dist < nearest ? dist : nearest;
        }, Infinity);
        if (nearestFriendly < 5)
            threatLevel = 'CRITICAL';
        else if (nearestFriendly < 20)
            threatLevel = 'HIGH';
        else if (nearestFriendly < 50)
            threatLevel = 'MEDIUM';
        else if (nearestFriendly < 100)
            threatLevel = 'LOW';
        else
            threatLevel = 'MINIMAL';
        return {
            id: `threat-${entity.id}`,
            entityId: entity.id,
            threatLevel,
            threatType: entity.unitType,
            capabilities: this.inferCapabilities(entity),
            intent: entity.status === 'ENGAGED' ? 'OFFENSIVE' : 'UNKNOWN',
            confidence: entity.confidence,
        };
    }
    /**
     * Infer capabilities from entity type
     */
    inferCapabilities(entity) {
        const capabilities = {
            INFANTRY: ['Ground assault', 'Area denial'],
            ARMOR: ['Breakthrough', 'Direct fire support'],
            ARTILLERY: ['Indirect fire', 'Area suppression'],
            AIR: ['Air superiority', 'Close air support', 'Reconnaissance'],
            NAVAL: ['Sea control', 'Power projection'],
            CYBER: ['Network disruption', 'Information warfare'],
            LOGISTICS: ['Supply', 'Transport'],
            COMMAND: ['Command and control', 'Coordination'],
            RECON: ['Intelligence gathering', 'Target acquisition'],
            SPECIAL_OPS: ['Precision strike', 'Sabotage', 'Infiltration'],
        };
        return capabilities[entity.unitType] || [];
    }
    /**
     * Calculate bounding box for all entities
     */
    calculateBoundingBox(entities) {
        if (entities.length === 0) {
            return {
                northWest: { latitude: 0, longitude: 0 },
                southEast: { latitude: 0, longitude: 0 },
            };
        }
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;
        for (const entity of entities) {
            minLat = Math.min(minLat, entity.location.latitude);
            maxLat = Math.max(maxLat, entity.location.latitude);
            minLon = Math.min(minLon, entity.location.longitude);
            maxLon = Math.max(maxLon, entity.location.longitude);
        }
        return {
            northWest: { latitude: maxLat, longitude: minLon },
            southEast: { latitude: minLat, longitude: maxLon },
        };
    }
    /**
     * Calculate overall confidence of fusion result
     */
    calculateOverallConfidence(entities) {
        if (entities.length === 0)
            return 0;
        return (entities.reduce((sum, e) => sum + e.fusionScore, 0) / entities.length);
    }
    /**
     * Get current cached entities
     */
    getEntityCache() {
        return new Map(this.entityCache);
    }
    /**
     * Clear stale entities from cache
     */
    clearStaleEntities() {
        const now = Date.now();
        const maxAge = this.config.maxEntityAge || 300000;
        let cleared = 0;
        for (const [key, entity] of this.entityCache) {
            if (now - entity.lastFused.getTime() > maxAge) {
                this.entityCache.delete(key);
                cleared++;
            }
        }
        return cleared;
    }
}
exports.FusionEngine = FusionEngine;
// =============================================================================
// DATA NORMALIZERS
// =============================================================================
function normalizeSensorReading(raw, sourceId) {
    const reading = raw;
    const events = [];
    for (const detection of reading.detections || []) {
        events.push({
            eventId: `sensor-${Date.now()}-${detection.id}`,
            sourceId,
            domain: 'SENSOR_GRID',
            timestamp: new Date(reading.timestamp),
            normalizedAt: new Date(),
            entityType: detection.classification || 'CONTACT',
            entityId: detection.id,
            location: detection.location,
            confidence: detection.confidence,
            data: {
                detectionType: detection.type,
                bearing: detection.bearing,
                range: detection.range,
                signature: detection.signature,
            },
            provenance: {
                sourceId,
                sourceDomain: 'SENSOR_GRID',
                reliability: 'B',
                credibility: 2,
                transformations: ['normalizeSensorReading'],
                correlationIds: [reading.sensorId],
            },
        });
    }
    return events;
}
function normalizeSatelliteImagery(raw, sourceId) {
    const imagery = raw;
    const events = [];
    for (const result of imagery.analysisResults || []) {
        events.push({
            eventId: `sat-${Date.now()}-${result.type}`,
            sourceId,
            domain: 'SATELLITE',
            timestamp: new Date(imagery.captureTime),
            normalizedAt: new Date(),
            entityType: result.classification || result.type,
            location: result.location,
            confidence: result.confidence,
            data: {
                imageId: imagery.imageId,
                satelliteId: imagery.satelliteId,
                resolution: imagery.resolution,
                classification: result.classification,
                dimensions: result.dimensions,
            },
            provenance: {
                sourceId,
                sourceDomain: 'SATELLITE',
                reliability: 'A',
                credibility: 1,
                transformations: ['normalizeSatelliteImagery'],
                correlationIds: [imagery.imageId],
            },
        });
    }
    return events;
}
function normalizeCommsIntercept(raw, sourceId) {
    const intercept = raw;
    return {
        eventId: `comms-${intercept.interceptId}`,
        sourceId,
        domain: 'COMMS',
        timestamp: new Date(intercept.timestamp),
        normalizedAt: new Date(),
        entityType: 'COMMS_INTERCEPT',
        location: intercept.sourceLocation,
        confidence: 0.7,
        data: {
            frequency: intercept.frequency,
            protocol: intercept.protocol,
            contentType: intercept.contentType,
            targetLocation: intercept.targetLocation,
        },
        provenance: {
            sourceId,
            sourceDomain: 'COMMS',
            reliability: 'C',
            credibility: 3,
            transformations: ['normalizeCommsIntercept'],
            correlationIds: [intercept.interceptId],
        },
    };
}
function normalizeCyberEvent(raw, sourceId) {
    const event = raw;
    return {
        eventId: `cyber-${event.eventId}`,
        sourceId,
        domain: 'CYBER',
        timestamp: new Date(event.timestamp),
        normalizedAt: new Date(),
        entityType: 'CYBER_THREAT',
        confidence: event.severity === 'CRITICAL' ? 0.9 : 0.6,
        data: {
            eventType: event.eventType,
            severity: event.severity,
            sourceIp: event.sourceIp,
            targetIp: event.targetIp,
            targetAsset: event.targetAsset,
            indicators: event.indicators,
            ttps: event.ttps,
            attribution: event.attribution,
        },
        provenance: {
            sourceId,
            sourceDomain: 'CYBER',
            reliability: 'B',
            credibility: 2,
            transformations: ['normalizeCyberEvent'],
            correlationIds: [event.eventId],
        },
    };
}
// =============================================================================
// EXPORTS
// =============================================================================
exports.default = FusionEngine;
