"use strict";
/**
 * Defensive Psychological Operations Service
 *
 * DEFENSIVE ONLY: Protects against psychological warfare, influence campaigns,
 * and cognitive manipulation attempts targeting the organization or users.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefensivePsyOpsService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const events_1 = require("events");
const ContentAnalyzer_js_1 = require("./ContentAnalyzer.js");
const event_bus_js_1 = require("../lib/events/event-bus.js");
class DefensivePsyOpsService extends events_1.EventEmitter {
    db = null;
    logger = logger_js_1.default;
    analyzer;
    constructor(dbPool) {
        super();
        this.analyzer = new ContentAnalyzer_js_1.ContentAnalyzer();
        if (dbPool) {
            this.db = dbPool;
        }
        this.initializeEventListeners();
    }
    /**
     * Lazy load the database pool to allow for isolated testing and avoid
     * import side-effects from the monolithic config.
     */
    async getDb() {
        if (this.db)
            return this.db;
        try {
            const { getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../config/database.js')));
            this.db = getPostgresPool();
            return this.db;
        }
        catch (error) {
            this.logger.error('Failed to load database config module', error);
            throw new Error('Database not initialized');
        }
    }
    initializeEventListeners() {
        event_bus_js_1.eventBus.on('raw-event', async (event) => {
            if (event.source === 'red-team' && (event.type === 'phishing' || event.type === 'influence')) {
                this.logger.info('Analyzing Red Team event for PsyOps...', { type: event.type });
                const content = event.data?.narrative || event.data?.description || JSON.stringify(event.data);
                // We capture errors here to prevent event bus crashes
                try {
                    await this.detectPsychologicalThreats(content, {
                        source: 'RED_TEAM_SIMULATION',
                        original_event_type: event.type,
                        ...event.data
                    });
                }
                catch (err) {
                    this.logger.error('Error processing Red Team event', err);
                }
            }
        });
    }
    async detectPsychologicalThreats(content, metadata) {
        try {
            const analysis = this.analyzer.analyze(content);
            if (analysis.manipulationScore > 0.4 || analysis.flags.length > 0) {
                const threatLevel = this.calculateThreatLevel(analysis.manipulationScore, analysis.flags);
                const threat = await this.persistThreat({
                    source: metadata.source || 'UNKNOWN',
                    threatLevel,
                    attackVector: analysis.keywords.join(',') || 'unknown',
                    narrative: content.substring(0, 1000),
                    sentiment: analysis.sentiment,
                    status: 'MONITORING',
                    metadata: { ...metadata, analysis }
                });
                this.emit('threatDetected', threat);
                this.logger.warn(`PsyOps Threat Detected: ${threat.id} [${threatLevel}]`);
                await this.logEvent(threat.id, 'THREAT_DETECTED', { analysis, metadata });
                return threat;
            }
            return null;
        }
        catch (error) {
            this.logger.error('Error detecting psychological threats:', error);
            return null;
        }
    }
    calculateThreatLevel(score, flags) {
        if (score > 0.8 || flags.includes('HIGH_RISK_DISINFO'))
            return 'CRITICAL';
        if (score > 0.6)
            return 'HIGH';
        if (score > 0.4)
            return 'MEDIUM';
        return 'LOW';
    }
    async persistThreat(data) {
        const db = await this.getDb();
        const query = `
      INSERT INTO psyops_threats
      (source, threat_level, attack_vector, narrative, sentiment_score, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
        const values = [
            data.source,
            data.threatLevel,
            data.attackVector,
            data.narrative,
            data.sentiment,
            data.status,
            JSON.stringify(data.metadata)
        ];
        const res = await db.query(query, values);
        return res.rows[0];
    }
    async logEvent(threatId, eventType, details) {
        const db = await this.getDb();
        const query = `
      INSERT INTO psyops_logs (threat_id, event_type, details)
      VALUES ($1, $2, $3)
    `;
        await db.query(query, [threatId, eventType, JSON.stringify(details)]);
    }
    async getActiveThreats() {
        const db = await this.getDb();
        const res = await db.query("SELECT * FROM psyops_threats WHERE status != 'RESOLVED' ORDER BY created_at DESC");
        return res.rows;
    }
    async resolveThreat(threatId, resolutionNotes) {
        const db = await this.getDb();
        await db.query("UPDATE psyops_threats SET status = 'RESOLVED', updated_at = NOW() WHERE id = $1", [threatId]);
        await this.logEvent(threatId, 'THREAT_RESOLVED', { notes: resolutionNotes });
    }
}
exports.DefensivePsyOpsService = DefensivePsyOpsService;
