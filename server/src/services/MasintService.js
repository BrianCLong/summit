"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasintService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const database_js_1 = require("../config/database.js");
class MasintService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!MasintService.instance) {
            MasintService.instance = new MasintService();
        }
        return MasintService.instance;
    }
    /**
     * Main entry point for processing any MASINT signal.
     */
    async processSignal(signalWrapper) {
        const { type, data } = signalWrapper;
        let result;
        logger_js_1.default.info({ type, id: data.id }, 'Processing MASINT signal');
        // Persist raw signal
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            await pool.query('INSERT INTO masint_signals (id, type, data, timestamp) VALUES ($1, $2, $3, $4)', [data.id, type, data, new Date(data.timestamp || new Date())]);
        }
        catch (err) {
            logger_js_1.default.error({ err, id: data.id }, 'Failed to persist raw MASINT signal');
            // Continue processing even if persistence fails? strictly speaking, we should probably fail.
            // But for robustness in this demo, we'll log and proceed, or throw.
            // Let's throw to ensure data integrity.
            throw new Error('Failed to persist signal');
        }
        // Find correlations
        const correlations = await this.findCorrelations(signalWrapper);
        switch (type) {
            case 'rf':
                result = await this.analyzeRF(data);
                break;
            case 'acoustic':
                result = await this.analyzeAcoustic(data);
                break;
            case 'nuclear':
                result = await this.analyzeNuclear(data);
                break;
            case 'chembio':
                result = await this.analyzeChemBio(data);
                break;
            case 'seismic':
                result = await this.analyzeSeismic(data);
                break;
            case 'radar':
                result = await this.analyzeRadar(data);
                break;
            case 'infrared':
                result = await this.analyzeInfrared(data);
                break;
            case 'spectral':
                result = await this.analyzeSpectral(data);
                break;
            case 'atmospheric':
                result = await this.analyzeAtmospheric(data);
                break;
            default:
                throw new Error(`Unknown signal type: ${type}`);
        }
        if (correlations.length > 0) {
            result.correlatedEvents = correlations;
            result.recommendations.push(`Correlate with events: ${correlations.join(', ')}`);
        }
        // Persist analysis result
        try {
            const pool = (0, database_js_1.getPostgresPool)();
            await pool.query('INSERT INTO masint_analysis (signal_id, result) VALUES ($1, $2)', [data.id, result]);
        }
        catch (err) {
            logger_js_1.default.error({ err, id: data.id }, 'Failed to persist MASINT analysis');
        }
        return result;
    }
    async findCorrelations(signalWrapper) {
        const { data } = signalWrapper;
        const pool = (0, database_js_1.getPostgresPool)();
        const correlations = [];
        let lat;
        let lon;
        // Handle standard 'location' property
        if ('location' in data && data.location) {
            lat = data.location.latitude;
            lon = data.location.longitude;
        }
        // Handle 'epicenter' property for Seismic signals
        else if ('epicenter' in data && data.epicenter) {
            lat = data.epicenter.latitude;
            lon = data.epicenter.longitude;
        }
        // If no location, skip spatial correlation
        if (lat === undefined || lon === undefined) {
            return [];
        }
        try {
            // JSONB query to find nearby signals.
            // Note: precise geospatial query requires PostGIS. This is a rough approximation using simple lat/lon matching in JSON.
            // We check both 'location' and 'epicenter' paths in the JSONB.
            // Assuming 1 degree approx 111km. 0.1 degree approx 11km.
            const query = `
        SELECT id FROM masint_signals
        WHERE id != $1
        AND timestamp > $2::timestamp - INTERVAL '5 minutes'
        AND timestamp < $2::timestamp + INTERVAL '5 minutes'
        AND (
          (
            ABS(CAST(data->'location'->>'latitude' AS FLOAT) - $3) < 0.1
            AND ABS(CAST(data->'location'->>'longitude' AS FLOAT) - $4) < 0.1
          )
          OR
          (
            ABS(CAST(data->'epicenter'->>'latitude' AS FLOAT) - $3) < 0.1
            AND ABS(CAST(data->'epicenter'->>'longitude' AS FLOAT) - $4) < 0.1
          )
        )
        LIMIT 5
      `;
            const res = await pool.query(query, [
                data.id,
                data.timestamp || new Date(),
                lat,
                lon
            ]);
            res.rows.forEach((row) => correlations.push(row.id));
        }
        catch (err) {
            logger_js_1.default.warn({ err }, 'Error finding correlations');
        }
        return correlations;
    }
    async analyzeRF(signal) {
        const threatLevel = signal.powerDbm > 50 ? 'HIGH' : 'LOW';
        const classification = signal.modulation === 'PULSE' ? 'RADAR' : 'COMMUNICATION';
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel,
            classification,
            confidence: 0.85,
            anomalies: signal.frequencyMhz > 10000 ? ['High Frequency Emission'] : [],
            recommendations: threatLevel === 'HIGH' ? ['Initiate jamming', 'Triangulate source'] : ['Monitor'],
        };
    }
    async analyzeAcoustic(signal) {
        const isExplosion = signal.amplitudeDb > 120 && signal.durationMs < 500;
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: isExplosion ? 'CRITICAL' : 'LOW',
            classification: isExplosion ? 'EXPLOSION' : signal.classification || 'UNKNOWN',
            confidence: 0.9,
            anomalies: [],
            recommendations: isExplosion ? ['Deploy emergency services', 'Check seismic correlation'] : [],
        };
    }
    async analyzeNuclear(signal) {
        const isWeaponsGrade = ['U-235', 'Pu-239'].includes(signal.isotope) && signal.radiationLevelSv > 0.001;
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: isWeaponsGrade ? 'CRITICAL' : 'MEDIUM',
            classification: isWeaponsGrade ? 'WEAPONS_MATERIAL' : 'INDUSTRIAL_SOURCE',
            confidence: 0.99,
            anomalies: signal.radiationLevelSv > 0.5 ? ['Lethal Dose Detected'] : [],
            recommendations: ['Isolate area', 'Deploy hazmat team'],
        };
    }
    async analyzeChemBio(signal) {
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: 'CRITICAL',
            classification: signal.agentName,
            confidence: signal.confidence,
            anomalies: ['Bio-agent detected'],
            recommendations: ['Activate containment protocols', 'Distribute antidotes'],
        };
    }
    async analyzeSeismic(signal) {
        const isNuclearTest = signal.eventType === 'explosion' && signal.depthKm < 1;
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: isNuclearTest ? 'CRITICAL' : 'LOW',
            classification: signal.eventType.toUpperCase(),
            confidence: 0.8,
            anomalies: isNuclearTest ? ['Shallow depth explosion signature'] : [],
            recommendations: isNuclearTest ? ['Verify with radionuclides', 'Notify command'] : [],
        };
    }
    async analyzeRadar(signal) {
        const isStealth = signal.rcsDbsm < -20;
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: isStealth ? 'HIGH' : 'MEDIUM',
            classification: isStealth ? 'STEALTH_AIRCRAFT' : 'STANDARD_TARGET',
            confidence: 0.75,
            anomalies: [],
            recommendations: isStealth ? ['Enable multi-static tracking'] : [],
        };
    }
    async analyzeInfrared(signal) {
        const isMissileLaunch = signal.intensityWattsPerSr > 5000 && (signal.sourceType === 'plume' || !signal.sourceType);
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: isMissileLaunch ? 'CRITICAL' : 'LOW',
            classification: isMissileLaunch ? 'MISSILE_LAUNCH' : 'THERMAL_SOURCE',
            confidence: 0.88,
            anomalies: [],
            recommendations: isMissileLaunch ? ['Activate missile defense'] : [],
        };
    }
    async analyzeSpectral(signal) {
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: 'LOW',
            classification: signal.materialClassification || 'UNKNOWN_MATERIAL',
            confidence: signal.confidence || 0.5,
            anomalies: [],
            recommendations: ['Catalog material signature'],
        };
    }
    async analyzeAtmospheric(signal) {
        return {
            signalId: signal.id,
            timestamp: new Date().toISOString(),
            threatLevel: 'LOW',
            classification: 'METEOROLOGICAL_DATA',
            confidence: 1.0,
            anomalies: [],
            recommendations: [],
        };
    }
    /**
     * Retrieve past analysis result.
     */
    async getAnalysis(signalId) {
        const pool = (0, database_js_1.getPostgresPool)();
        try {
            const res = await pool.query('SELECT result FROM masint_analysis WHERE signal_id = $1', [signalId]);
            if (res.rows.length > 0) {
                return res.rows[0].result;
            }
        }
        catch (err) {
            logger_js_1.default.error({ err, signalId }, 'Error retrieving analysis');
        }
        return undefined;
    }
}
exports.MasintService = MasintService;
