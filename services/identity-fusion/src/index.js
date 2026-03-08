"use strict";
/**
 * Identity Fusion Service
 *
 * Service for multi-modal biometric fusion, cross-source identity matching,
 * and identity intelligence.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.IdentityFusionService = void 0;
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const biometrics_1 = require("@intelgraph/biometrics");
const config = {
    port: parseInt(process.env.FUSION_SERVICE_PORT || '8081', 10),
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'biometrics',
        user: process.env.DB_USER || 'biometric_user',
        password: process.env.DB_PASSWORD || ''
    },
    fusion: {
        defaultStrategy: 'SCORE_LEVEL',
        defaultThreshold: 70,
        modalityWeights: {
            [biometrics_1.BiometricModality.FACE]: 0.4,
            [biometrics_1.BiometricModality.FINGERPRINT]: 0.3,
            [biometrics_1.BiometricModality.IRIS]: 0.3,
            [biometrics_1.BiometricModality.VOICE]: 0.2,
            [biometrics_1.BiometricModality.GAIT]: 0.15,
            [biometrics_1.BiometricModality.KEYSTROKE]: 0.1,
            [biometrics_1.BiometricModality.SIGNATURE]: 0.15,
            [biometrics_1.BiometricModality.PALM_PRINT]: 0.25,
            [biometrics_1.BiometricModality.VEIN_PATTERN]: 0.25,
            [biometrics_1.BiometricModality.DNA]: 0.5,
            [biometrics_1.BiometricModality.EAR_SHAPE]: 0.1,
            [biometrics_1.BiometricModality.BEHAVIORAL]: 0.15
        }
    }
};
exports.config = config;
// ============================================================================
// Database Connection
// ============================================================================
const pool = new pg_1.Pool(config.database);
// ============================================================================
// Identity Fusion Service Class
// ============================================================================
class IdentityFusionService {
    /**
     * Fuse multiple biometric modalities for enhanced matching
     */
    async fuseBiometrics(data) {
        const strategy = data.strategy || config.fusion.defaultStrategy;
        const threshold = data.threshold || config.fusion.defaultThreshold;
        // Calculate weighted scores
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let totalConfidence = 0;
        const modalityWeights = data.modalityScores.map(ms => {
            const weight = config.fusion.modalityWeights[ms.modality] || 0.1;
            const weightedScore = ms.score * weight;
            totalWeightedScore += weightedScore;
            totalWeight += weight;
            totalConfidence += ms.confidence * weight;
            return {
                modality: ms.modality,
                score: ms.score,
                confidence: ms.confidence,
                weight
            };
        });
        // Normalize scores
        const fusedScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
        const fusedConfidence = totalWeight > 0 ? (totalConfidence / totalWeight) : 0;
        const isMatch = fusedScore >= threshold;
        const result = {
            fusionId: crypto.randomUUID(),
            strategy,
            identityId: data.identityId,
            modalityScores: data.modalityScores.map((ms, i) => ({
                ...ms,
                weight: modalityWeights[i].weight
            })),
            fusedScore,
            fusedConfidence,
            isMatch,
            threshold,
            modalityWeights,
            metadata: {
                processingTime: 10,
                algorithmVersion: '1.0.0',
                timestamp: new Date().toISOString()
            }
        };
        return result;
    }
    /**
     * Resolve identity across multiple sources
     */
    async resolveIdentity(data) {
        const client = await pool.connect();
        try {
            // Query identity records from multiple sources
            const result = await client.query(`SELECT * FROM identity_records
         WHERE sources && $1
         ORDER BY confidence DESC
         LIMIT 10`, [data.sources]);
            if (result.rows.length === 0) {
                return null;
            }
            // Placeholder: Would perform actual matching logic here
            const targetIdentity = {
                identityId: crypto.randomUUID(),
                type: 'PERSON',
                metadata: {
                    sources: data.sources,
                    confidence: 0.85,
                    createdDate: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    verificationStatus: 'UNVERIFIED'
                }
            };
            const crossSourceMatch = {
                matchId: crypto.randomUUID(),
                targetIdentity,
                sourceMatches: [],
                consolidatedIdentity: targetIdentity,
                confidence: 0.85,
                metadata: {
                    matchingStrategy: 'fuzzy_matching',
                    processingTime: 50,
                    timestamp: new Date().toISOString()
                }
            };
            return crossSourceMatch;
        }
        finally {
            client.release();
        }
    }
    /**
     * Build identity graph showing relationships
     */
    async buildIdentityGraph(identityId) {
        const client = await pool.connect();
        try {
            // Get identity and related records
            const identityResult = await client.query(`SELECT * FROM identity_records WHERE identity_id = $1`, [identityId]);
            // Get aliases
            const aliasResult = await client.query(`SELECT * FROM identity_aliases
         WHERE primary_identity_id = $1 OR alias_identity_id = $1`, [identityId]);
            // Build graph structure
            const graph = {
                graphId: crypto.randomUUID(),
                nodes: [
                    {
                        nodeId: identityId,
                        identityId,
                        nodeType: 'PERSON',
                        data: identityResult.rows[0] || {},
                        confidence: 1.0
                    }
                ],
                edges: aliasResult.rows.map(row => ({
                    edgeId: row.relationship_id,
                    sourceNode: row.primary_identity_id,
                    targetNode: row.alias_identity_id,
                    edgeType: 'ALIAS_OF',
                    strength: 0.8,
                    confidence: row.confidence,
                    evidence: []
                })),
                metadata: {
                    nodeCount: 1,
                    edgeCount: aliasResult.rows.length,
                    density: 0.5,
                    createdDate: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                }
            };
            return graph;
        }
        finally {
            client.release();
        }
    }
    /**
     * Attribute digital activities to an identity
     */
    async attributeActivity(data) {
        const attribution = {
            attributionId: crypto.randomUUID(),
            identityId: data.identityId,
            digitalFootprint: {
                ipAddresses: (data.ipAddresses || []).map(ip => ({
                    ip,
                    firstSeen: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                    frequency: 1
                })),
                deviceFingerprints: (data.deviceFingerprints || []).map(fp => ({
                    fingerprintId: fp,
                    deviceType: 'UNKNOWN',
                    firstSeen: new Date().toISOString(),
                    lastSeen: new Date().toISOString()
                }))
            },
            geolocation: data.geolocation ? {
                primaryLocations: data.geolocation.map(loc => ({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    frequency: 1
                }))
            } : undefined,
            confidence: 0.75,
            metadata: {
                sources: ['system'],
                analysisDate: new Date().toISOString()
            }
        };
        return attribution;
    }
    /**
     * Get identity record
     */
    async getIdentity(identityId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`SELECT * FROM identity_records WHERE identity_id = $1`, [identityId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                identityId: row.identity_id,
                type: row.type,
                biographicData: row.biographic_data,
                biometricData: row.biometric_data,
                documentData: row.document_data,
                digitalData: row.digital_data,
                locationData: row.location_data,
                metadata: {
                    sources: row.sources,
                    confidence: row.confidence,
                    createdDate: row.created_date,
                    lastUpdated: row.last_updated,
                    verificationStatus: row.verification_status,
                    reliability: row.reliability_score
                }
            };
        }
        finally {
            client.release();
        }
    }
}
exports.IdentityFusionService = IdentityFusionService;
// ============================================================================
// Express API
// ============================================================================
const app = (0, express_1.default)();
const service = new IdentityFusionService();
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Fuse biometrics
app.post('/api/v1/fuse', async (req, res, next) => {
    try {
        const result = await service.fuseBiometrics(req.body);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Resolve identity
app.post('/api/v1/resolve', async (req, res, next) => {
    try {
        const result = await service.resolveIdentity(req.body);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Build identity graph
app.get('/api/v1/graph/:identityId', async (req, res, next) => {
    try {
        const result = await service.buildIdentityGraph(req.params.identityId);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Attribute activity
app.post('/api/v1/attribute', async (req, res, next) => {
    try {
        const result = await service.attributeActivity(req.body);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Get identity
app.get('/api/v1/identities/:identityId', async (req, res, next) => {
    try {
        const result = await service.getIdentity(req.params.identityId);
        if (!result) {
            res.status(404).json({ error: 'Identity not found' });
            return;
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});
// ============================================================================
// Service Startup
// ============================================================================
async function start() {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('Connected to PostgreSQL');
        // Start server
        app.listen(config.port, () => {
            console.log(`Identity fusion service listening on port ${config.port}`);
        });
    }
    catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}
// Handle shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await pool.end();
    process.exit(0);
});
// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    start();
}
