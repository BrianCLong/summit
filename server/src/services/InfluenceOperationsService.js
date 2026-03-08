"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluenceOperationsService = void 0;
const CIBDetectionService_js_1 = require("./CIBDetectionService.js");
const NarrativeAnalysisService_js_1 = require("./NarrativeAnalysisService.js");
const CrossPlatformAttributionService_js_1 = require("./CrossPlatformAttributionService.js");
const GraphAnalyticsService_js_1 = __importDefault(require("./GraphAnalyticsService.js"));
class InfluenceOperationsService {
    cibService;
    narrativeService;
    attributionService;
    graphService;
    static instance;
    static getInstance() {
        if (!InfluenceOperationsService.instance) {
            InfluenceOperationsService.instance = new InfluenceOperationsService();
        }
        return InfluenceOperationsService.instance;
    }
    constructor() {
        this.cibService = new CIBDetectionService_js_1.CIBDetectionService();
        this.narrativeService = new NarrativeAnalysisService_js_1.NarrativeAnalysisService();
        this.attributionService = new CrossPlatformAttributionService_js_1.CrossPlatformAttributionService();
        this.graphService = GraphAnalyticsService_js_1.default.getInstance();
    }
    /**
     * Orchestrates the detection of influence operations.
     */
    async detectInfluenceOperations(campaignId) {
        // 1. Detect CIB (Stubbed call, usually requires entity list and data)
        // For orchestration, we might query the campaign entities first.
        // Assuming campaignId -> investigationId
        const cibResult = await this.cibService.detectCIB([], new Map(), new Map()); // Placeholder
        // 2. Analyze Narrative Evolution
        const narrativeEvolution = await this.narrativeService.takeSnapshot(campaignId);
        // 3. Calculate Influence Scores
        const influenceScores = await this.graphService.centrality({
            tenantId: 'system', // Context required
            scope: { investigationId: campaignId },
            algorithm: 'pageRank'
        });
        return {
            cib: cibResult,
            narrative: narrativeEvolution,
            influenceScores,
            timestamp: new Date()
        };
    }
    async getNarrativeTimeline(narrativeId) {
        return this.narrativeService.getNarrativeEvolution(narrativeId);
    }
    async getInfluenceNetwork(narrativeId) {
        // For Influence Network, we want Centrality and Communities
        // We assume tenantId is available from context or passed.
        // Since this method signature doesn't have it, we default or should update signature.
        // For prototype, we default to 'system' or 'current'.
        const centrality = await this.graphService.centrality({
            tenantId: 'system',
            scope: { investigationId: narrativeId },
            algorithm: 'pageRank'
        });
        const communities = await this.graphService.communities({
            tenantId: 'system',
            scope: { investigationId: narrativeId },
            algorithm: 'louvain'
        });
        return { centrality, communities };
    }
}
exports.InfluenceOperationsService = InfluenceOperationsService;
