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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = __importDefault(require("express"));
// import { OSINTPrioritizationService } from '../services/OSINTPrioritizationService.js';
// import { VeracityScoringService } from '../services/VeracityScoringService.js';
const OSINTQueueService_js_1 = require("../services/OSINTQueueService.js");
const auth_js_1 = require("../middleware/auth.js");
const osintRateLimiter_js_1 = require("../middleware/osintRateLimiter.js");
const postgres_js_1 = require("../db/postgres.js");
const security_audit_logger_js_1 = require("../audit/security-audit-logger.js");
const router = express_1.default.Router();
// const prioritizationService = new OSINTPrioritizationService();
// const veracityService = new VeracityScoringService();
const COLLECTION_TYPE_WEB_SCRAPING = 'web_scraping';
const TASK_STATUS_PENDING = 'pending';
let simpleFeedCollectorPromise;
async function loadSimpleFeedCollector() {
    if (!simpleFeedCollectorPromise) {
        const moduleUrl = new URL('../../../packages/osint-collector/src/collectors/SimpleFeedCollector.js', import.meta.url).href;
        simpleFeedCollectorPromise = Promise.resolve(`${moduleUrl}`).then(s => __importStar(require(s))).then((module) => module.SimpleFeedCollector);
    }
    return simpleFeedCollectorPromise;
}
router.use(osintRateLimiter_js_1.osintRateLimiter);
// Trigger prioritization cycle
router.post('/prioritize', auth_js_1.ensureAuthenticated, async (req, res) => {
    res.status(501).json({ success: false, error: 'OSINTPrioritizationService not implemented' });
});
// Manually trigger scoring for an entity
router.post('/score/:id', auth_js_1.ensureAuthenticated, async (req, res) => {
    res.status(501).json({ success: false, error: 'VeracityScoringService not implemented' });
});
// Ingest OSINT Feed (Thin Slice)
router.post('/ingest-feed', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { url } = req.body;
        security_audit_logger_js_1.securityAudit.logDataImport({
            actor: req.user?.tenantId ?? 'unknown',
            tenantId: req.user?.tenantId,
            resourceType: 'osint_feed',
            resourceId: url ?? 'unknown',
            action: 'ingest',
            details: { feedUrl: url },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            dataClassification: 'confidential',
        });
        // Use the Real Collector
        const SimpleFeedCollector = await loadSimpleFeedCollector();
        const collector = new SimpleFeedCollector({
            name: 'on-demand-feed',
            type: COLLECTION_TYPE_WEB_SCRAPING,
            enabled: true,
            feedUrl: url
        });
        await collector.initialize();
        const result = await collector.collect({
            id: `manual-${Date.now()}`,
            type: COLLECTION_TYPE_WEB_SCRAPING,
            source: url,
            target: 'iocs',
            priority: 1,
            scheduledAt: new Date(),
            status: TASK_STATUS_PENDING,
            config: { url }
        });
        // Persist to Database
        const pg = (0, postgres_js_1.getPostgresPool)();
        const iocs = result.data;
        let insertedCount = 0;
        // Batch insert would be better but simple loop for MVP slice
        for (const ioc of iocs) {
            await pg.query(`INSERT INTO iocs (type, value, source, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT DO NOTHING`, // simplified handling
            [ioc.type, ioc.value, ioc.source]);
            insertedCount++;
        }
        res.json({
            success: true,
            message: 'Feed ingested and persisted',
            count: insertedCount,
            data: iocs.slice(0, 5) // Return sample
        });
    }
    catch (error) {
        console.error('Ingest error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// Run Risk Assessment (Local LLM Slice)
router.post('/assess-risk', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const { iocs } = req.body;
        if (!iocs || !Array.isArray(iocs)) {
            return res.status(400).json({ success: false, error: 'iocs array required' });
        }
        security_audit_logger_js_1.securityAudit.logSensitiveRead({
            actor: req.user?.tenantId ?? 'unknown',
            tenantId: req.user?.tenantId,
            resourceType: 'osint_risk_assessment',
            resourceId: `batch-${iocs.length}`,
            action: 'assess',
            details: { iocCount: iocs.length },
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            dataClassification: 'confidential',
        });
        const results = [];
        const llmEndpoint = process.env.LLM_ENDPOINT;
        for (const ioc of iocs) {
            let riskAssessment;
            // Try Real LLM if configured
            if (llmEndpoint) {
                try {
                    const response = await fetch(`${llmEndpoint}/generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: `Assess the cybersecurity risk of the following IOC: ${ioc.value}. Return JSON with "score" (0-1) and "summary".`,
                            model: 'llama3'
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        riskAssessment = {
                            ioc: ioc.value,
                            risk_score: data.score || 0.5,
                            risk_summary: data.summary || 'AI Assessment',
                            model: 'llama3-local'
                        };
                    }
                }
                catch (e) {
                    console.warn('LLM connection failed, falling back to heuristic', e);
                }
            }
            // Fallback Heuristic
            if (!riskAssessment) {
                riskAssessment = {
                    ioc: ioc.value,
                    risk_score: ioc.value.includes('192') || ioc.value.includes('127') ? 0.1 : 0.7,
                    risk_summary: ioc.value.includes('192')
                        ? 'Low risk local network address.'
                        : 'Potential public IP, requires further investigation.',
                    model: 'heuristic-v1'
                };
            }
            results.push(riskAssessment);
        }
        res.json({
            success: true,
            results
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get queue status
router.get('/queue', auth_js_1.ensureAuthenticated, async (req, res) => {
    try {
        const counts = await OSINTQueueService_js_1.osintQueue.getJobCounts();
        res.json({ success: true, counts });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
