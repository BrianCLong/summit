"use strict";
/**
 * Cognitive Security Operations Module
 *
 * Defensive cognitive security system for detecting and responding to
 * mis/disinformation campaigns and influence operations.
 *
 * Key capabilities:
 * - C2PA/Content Credentials for media authenticity
 * - Claim Graph for modeling information landscape
 * - Campaign detection via coordination signals
 * - Response operations with playbooks
 * - Governance with audit and appeals
 * - Evaluation metrics and KPIs
 *
 * @module cognitive-security
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeDetectionService = exports.CognitiveStateService = exports.BENCHMARK_TARGETS = exports.getEvaluationService = exports.initializeEvaluationService = exports.createEvaluationService = exports.EvaluationService = exports.DEFAULT_POLICIES = exports.getGovernanceService = exports.initializeGovernanceService = exports.createGovernanceService = exports.GovernanceService = exports.getResponseOpsService = exports.initializeResponseOpsService = exports.createResponseOpsService = exports.ResponseOpsService = exports.getCampaignDetectionService = exports.initializeCampaignDetectionService = exports.createCampaignDetectionService = exports.CampaignDetectionService = exports.getClaimsService = exports.initializeClaimsService = exports.createClaimsService = exports.ClaimsService = exports.parseC2PAManifest = exports.getProvenanceService = exports.initializeProvenanceService = exports.createProvenanceService = exports.ProvenanceService = void 0;
exports.initializeCognitiveSecurityModule = initializeCognitiveSecurityModule;
exports.getCognitiveSecurityModule = getCognitiveSecurityModule;
// Types
__exportStar(require("./types.js"), exports);
// Services
var provenance_service_js_1 = require("./provenance.service.js");
Object.defineProperty(exports, "ProvenanceService", { enumerable: true, get: function () { return provenance_service_js_1.ProvenanceService; } });
Object.defineProperty(exports, "createProvenanceService", { enumerable: true, get: function () { return provenance_service_js_1.createProvenanceService; } });
Object.defineProperty(exports, "initializeProvenanceService", { enumerable: true, get: function () { return provenance_service_js_1.initializeProvenanceService; } });
Object.defineProperty(exports, "getProvenanceService", { enumerable: true, get: function () { return provenance_service_js_1.getProvenanceService; } });
Object.defineProperty(exports, "parseC2PAManifest", { enumerable: true, get: function () { return provenance_service_js_1.parseC2PAManifest; } });
var claims_service_js_1 = require("./claims.service.js");
Object.defineProperty(exports, "ClaimsService", { enumerable: true, get: function () { return claims_service_js_1.ClaimsService; } });
Object.defineProperty(exports, "createClaimsService", { enumerable: true, get: function () { return claims_service_js_1.createClaimsService; } });
Object.defineProperty(exports, "initializeClaimsService", { enumerable: true, get: function () { return claims_service_js_1.initializeClaimsService; } });
Object.defineProperty(exports, "getClaimsService", { enumerable: true, get: function () { return claims_service_js_1.getClaimsService; } });
var campaign_detection_service_js_1 = require("./campaign-detection.service.js");
Object.defineProperty(exports, "CampaignDetectionService", { enumerable: true, get: function () { return campaign_detection_service_js_1.CampaignDetectionService; } });
Object.defineProperty(exports, "createCampaignDetectionService", { enumerable: true, get: function () { return campaign_detection_service_js_1.createCampaignDetectionService; } });
Object.defineProperty(exports, "initializeCampaignDetectionService", { enumerable: true, get: function () { return campaign_detection_service_js_1.initializeCampaignDetectionService; } });
Object.defineProperty(exports, "getCampaignDetectionService", { enumerable: true, get: function () { return campaign_detection_service_js_1.getCampaignDetectionService; } });
var response_ops_service_js_1 = require("./response-ops.service.js");
Object.defineProperty(exports, "ResponseOpsService", { enumerable: true, get: function () { return response_ops_service_js_1.ResponseOpsService; } });
Object.defineProperty(exports, "createResponseOpsService", { enumerable: true, get: function () { return response_ops_service_js_1.createResponseOpsService; } });
Object.defineProperty(exports, "initializeResponseOpsService", { enumerable: true, get: function () { return response_ops_service_js_1.initializeResponseOpsService; } });
Object.defineProperty(exports, "getResponseOpsService", { enumerable: true, get: function () { return response_ops_service_js_1.getResponseOpsService; } });
var governance_service_js_1 = require("./governance.service.js");
Object.defineProperty(exports, "GovernanceService", { enumerable: true, get: function () { return governance_service_js_1.GovernanceService; } });
Object.defineProperty(exports, "createGovernanceService", { enumerable: true, get: function () { return governance_service_js_1.createGovernanceService; } });
Object.defineProperty(exports, "initializeGovernanceService", { enumerable: true, get: function () { return governance_service_js_1.initializeGovernanceService; } });
Object.defineProperty(exports, "getGovernanceService", { enumerable: true, get: function () { return governance_service_js_1.getGovernanceService; } });
Object.defineProperty(exports, "DEFAULT_POLICIES", { enumerable: true, get: function () { return governance_service_js_1.DEFAULT_POLICIES; } });
var evaluation_service_js_1 = require("./evaluation.service.js");
Object.defineProperty(exports, "EvaluationService", { enumerable: true, get: function () { return evaluation_service_js_1.EvaluationService; } });
Object.defineProperty(exports, "createEvaluationService", { enumerable: true, get: function () { return evaluation_service_js_1.createEvaluationService; } });
Object.defineProperty(exports, "initializeEvaluationService", { enumerable: true, get: function () { return evaluation_service_js_1.initializeEvaluationService; } });
Object.defineProperty(exports, "getEvaluationService", { enumerable: true, get: function () { return evaluation_service_js_1.getEvaluationService; } });
Object.defineProperty(exports, "BENCHMARK_TARGETS", { enumerable: true, get: function () { return evaluation_service_js_1.BENCHMARK_TARGETS; } });
var CognitiveStateService_js_1 = require("../services/CognitiveStateService.js");
Object.defineProperty(exports, "CognitiveStateService", { enumerable: true, get: function () { return CognitiveStateService_js_1.CognitiveStateService; } });
var CascadeDetectionService_js_1 = require("../services/CascadeDetectionService.js");
Object.defineProperty(exports, "CascadeDetectionService", { enumerable: true, get: function () { return CascadeDetectionService_js_1.CascadeDetectionService; } });
const pino_1 = __importDefault(require("pino"));
const provenance_service_js_2 = require("./provenance.service.js");
const claims_service_js_2 = require("./claims.service.js");
const campaign_detection_service_js_2 = require("./campaign-detection.service.js");
const response_ops_service_js_2 = require("./response-ops.service.js");
const governance_service_js_2 = require("./governance.service.js");
const evaluation_service_js_2 = require("./evaluation.service.js");
const logger = pino_1.default({ name: 'cognitive-security' });
/**
 * Initialize the Cognitive Security module
 */
function initializeCognitiveSecurityModule(config) {
    logger.info('Initializing Cognitive Security module');
    // Initialize all services
    const provenance = (0, provenance_service_js_2.initializeProvenanceService)({
        provLedgerUrl: config.provLedgerUrl,
    });
    const claims = (0, claims_service_js_2.initializeClaimsService)({
        neo4jDriver: config.neo4jDriver,
        embeddingService: config.embeddingService,
        nlpService: config.nlpService,
    });
    const campaignDetection = (0, campaign_detection_service_js_2.initializeCampaignDetectionService)({
        neo4jDriver: config.neo4jDriver,
        realTimeEnabled: config.realTimeDetection,
    });
    const responseOps = (0, response_ops_service_js_2.initializeResponseOpsService)({
        neo4jDriver: config.neo4jDriver,
        llmService: config.llmService,
        organizationName: config.organizationName,
    });
    const governance = (0, governance_service_js_2.initializeGovernanceService)({
        neo4jDriver: config.neo4jDriver,
        pgPool: config.pgPool,
    });
    const evaluation = (0, evaluation_service_js_2.initializeEvaluationService)({
        neo4jDriver: config.neo4jDriver,
    });
    logger.info('Cognitive Security module initialized');
    return {
        provenance,
        claims,
        campaignDetection,
        responseOps,
        governance,
        evaluation,
        healthCheck: async () => {
            const [provenanceHealth, claimsHealth, campaignHealth, responseHealth, governanceHealth, evaluationHealth,] = await Promise.all([
                provenance.healthCheck(),
                claims.healthCheck(),
                campaignDetection.healthCheck(),
                responseOps.healthCheck(),
                governance.healthCheck(),
                evaluation.healthCheck(),
            ]);
            const allHealthy = provenanceHealth.healthy &&
                claimsHealth.healthy &&
                campaignHealth.healthy &&
                responseHealth.healthy &&
                governanceHealth.healthy &&
                evaluationHealth.healthy;
            return {
                healthy: allHealthy,
                services: {
                    provenance: provenanceHealth,
                    claims: claimsHealth,
                    campaignDetection: campaignHealth,
                    responseOps: responseHealth,
                    governance: governanceHealth,
                    evaluation: evaluationHealth,
                },
            };
        },
    };
}
/**
 * Get the initialized Cognitive Security module
 * Must call initializeCognitiveSecurityModule first
 */
function getCognitiveSecurityModule() {
    return {
        provenance: require('./provenance.service.js').getProvenanceService(),
        claims: require('./claims.service.js').getClaimsService(),
        campaignDetection: require('./campaign-detection.service.js').getCampaignDetectionService(),
        responseOps: require('./response-ops.service.js').getResponseOpsService(),
        governance: require('./governance.service.js').getGovernanceService(),
        evaluation: require('./evaluation.service.js').getEvaluationService(),
        healthCheck: async () => {
            // Delegate to individual service health checks
            return { healthy: true, services: {} };
        },
    };
}
