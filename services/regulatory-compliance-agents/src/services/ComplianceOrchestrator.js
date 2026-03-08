"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceOrchestrator = void 0;
const events_1 = require("events");
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const RegulationFeedMonitor_js_1 = require("../agents/RegulationFeedMonitor.js");
const RegulationAnalysisAgent_js_1 = require("../agents/RegulationAnalysisAgent.js");
const ComplianceImpactAssessor_js_1 = require("../agents/ComplianceImpactAssessor.js");
const WorkflowAdaptationAgent_js_1 = require("../agents/WorkflowAdaptationAgent.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createAgentLogger)('ComplianceOrchestrator');
/**
 * ComplianceOrchestrator - Coordinates all compliance monitoring agents
 * to provide end-to-end autonomous regulatory compliance management.
 */
class ComplianceOrchestrator extends events_1.EventEmitter {
    feedMonitor;
    analysisAgent;
    impactAssessor;
    adaptationAgent;
    pg;
    config;
    // Track processing state
    regulationStore = new Map();
    assessmentStore = new Map();
    adaptationStore = new Map();
    eventLog = [];
    constructor(pgPool, config) {
        super();
        this.pg = pgPool || new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.config = {
            autoApplyLowRiskAdaptations: true,
            riskThresholdForAutoApply: 30,
            enableCrossBorderMonitoring: true,
            jurisdictions: ['US', 'EU', 'UK'],
            ...config,
        };
        // Initialize agents
        this.feedMonitor = new RegulationFeedMonitor_js_1.RegulationFeedMonitor();
        this.analysisAgent = new RegulationAnalysisAgent_js_1.RegulationAnalysisAgent();
        this.impactAssessor = new ComplianceImpactAssessor_js_1.ComplianceImpactAssessor(this.pg);
        this.adaptationAgent = new WorkflowAdaptationAgent_js_1.WorkflowAdaptationAgent(this.pg);
        this.wireAgentEvents();
    }
    /**
     * Wire up agent event handlers for autonomous processing
     */
    wireAgentEvents() {
        // Feed Monitor -> Analysis Agent
        this.feedMonitor.on('regulation_detected', async (event) => {
            this.eventLog.push(event);
            const regulation = event.payload;
            this.regulationStore.set(regulation.id, regulation);
            logger.info({ regulationId: regulation.id }, 'Processing detected regulation');
            await this.analysisAgent.queueForAnalysis(regulation);
        });
        // Analysis Agent -> Impact Assessor
        this.analysisAgent.on('analysis_complete', async (event) => {
            this.eventLog.push(event);
            const { regulation, analysis } = event.payload;
            logger.info({ regulationId: regulation.id }, 'Running impact assessment');
            await this.impactAssessor.assessImpact(regulation, analysis);
        });
        // Impact Assessor -> Adaptation Agent
        this.impactAssessor.on('impact_assessed', async (event) => {
            this.eventLog.push(event);
            const { regulation, assessment } = event.payload;
            this.assessmentStore.set(regulation.id, assessment);
            logger.info({ regulationId: regulation.id, riskScore: assessment.riskScore }, 'Generating adaptations');
            const adaptations = await this.adaptationAgent.generateAdaptations(regulation, assessment);
            this.adaptationStore.set(regulation.id, adaptations);
            // Auto-apply low-risk adaptations if configured
            if (this.config.autoApplyLowRiskAdaptations && assessment.riskScore < this.config.riskThresholdForAutoApply) {
                for (const adaptation of adaptations) {
                    if (!adaptation.requiresApproval) {
                        await this.adaptationAgent.applyAdaptation(adaptation.id);
                    }
                }
            }
            // Emit orchestrator event
            this.emit('compliance_cycle_complete', {
                regulationId: regulation.id,
                assessment,
                adaptations,
            });
        });
        // Track adaptation events
        this.adaptationAgent.on('adaptation_created', (event) => {
            this.eventLog.push(event);
        });
    }
    /**
     * Initialize and start the compliance monitoring system
     */
    async start(sources) {
        logger.info('Starting Compliance Orchestrator');
        // Load system inventory
        await this.impactAssessor.loadSystemInventory();
        // Register regulatory sources
        const regulatorySources = sources || (await Promise.resolve().then(() => __importStar(require('../types/index.js')))).REGULATORY_SOURCES;
        for (const source of regulatorySources) {
            // Filter by configured jurisdictions
            if (this.config.jurisdictions.includes(source.jurisdiction) ||
                (this.config.enableCrossBorderMonitoring && source.jurisdiction === 'INTL')) {
                this.feedMonitor.registerSource({
                    ...source,
                    id: (0, uuid_1.v4)(),
                });
            }
        }
        // Start monitoring
        this.feedMonitor.startMonitoring();
        logger.info({ sourceCount: this.feedMonitor.getStats().sourcesActive }, 'Compliance monitoring started');
    }
    /**
     * Stop compliance monitoring
     */
    stop() {
        this.feedMonitor.stopMonitoring();
        logger.info('Compliance monitoring stopped');
    }
    /**
     * Manually trigger analysis of a regulation URL
     */
    async analyzeRegulationUrl(url, jurisdiction) {
        const regulation = {
            id: (0, uuid_1.v4)(),
            sourceId: 'manual',
            externalId: url,
            title: `Manual regulation from ${url}`,
            jurisdiction: jurisdiction,
            regulatoryBody: 'Manual Entry',
            categories: [],
            publishedDate: new Date(),
            status: 'proposed',
            url,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.regulationStore.set(regulation.id, regulation);
        // Process through the pipeline
        await this.analysisAgent.queueForAnalysis(regulation);
        // Wait for processing (simplified - in production use proper async coordination)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            regulation,
            assessment: this.assessmentStore.get(regulation.id),
            adaptations: this.adaptationStore.get(regulation.id) || [],
        };
    }
    /**
     * Generate compliance report
     */
    generateReport(startDate, endDate) {
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate || new Date();
        const regulations = Array.from(this.regulationStore.values())
            .filter(r => r.createdAt >= start && r.createdAt <= end);
        const assessments = Array.from(this.assessmentStore.values());
        const allAdaptations = Array.from(this.adaptationStore.values()).flat();
        const appliedAdaptations = allAdaptations.filter(a => a.status === 'applied');
        const avgRiskScore = assessments.length > 0
            ? assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length
            : 0;
        return {
            id: (0, uuid_1.v4)(),
            generatedAt: new Date(),
            period: { start, end },
            summary: {
                regulationsDetected: regulations.length,
                impactAssessments: assessments.length,
                adaptationsCreated: allAdaptations.length,
                adaptationsApplied: appliedAdaptations.length,
                averageRiskScore: Math.round(avgRiskScore),
            },
            regulations: regulations.map(regulation => ({
                regulation,
                assessment: this.assessmentStore.get(regulation.id) || null,
                adaptations: this.adaptationStore.get(regulation.id) || [],
            })),
        };
    }
    /**
     * Approve a pending adaptation
     */
    approveAdaptation(adaptationId, approvedBy) {
        return this.adaptationAgent.approveAdaptation(adaptationId, approvedBy);
    }
    /**
     * Apply an approved adaptation
     */
    async applyAdaptation(adaptationId) {
        return this.adaptationAgent.applyAdaptation(adaptationId);
    }
    /**
     * Get all pending adaptations
     */
    getPendingAdaptations() {
        return this.adaptationAgent.getPendingAdaptations();
    }
    /**
     * Get system statistics
     */
    getStats() {
        return {
            feedMonitor: this.feedMonitor.getStats(),
            analysisAgent: this.analysisAgent.getStats(),
            regulationsTracked: this.regulationStore.size,
            assessmentsCompleted: this.assessmentStore.size,
            adaptationsGenerated: Array.from(this.adaptationStore.values()).flat().length,
            eventsLogged: this.eventLog.length,
        };
    }
    /**
     * Get event log
     */
    getEventLog(limit = 100) {
        return this.eventLog.slice(-limit);
    }
}
exports.ComplianceOrchestrator = ComplianceOrchestrator;
