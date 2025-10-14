/**
 * IntelGraph GA-Core Graph-XAI Routes
 * Committee Requirements: XAI explainer endpoints, model cards, detector integration
 * Magruder: "Graph-XAI layer is a differentiator; ship the explainers on day one"
 */
import express from 'express';
import { requireAuthority, requireReasonForAccess } from '../middleware/authority.js';
import GraphXAIExplainer from '../services/xai/graph-explainer.js';
import DetectorService from '../services/xai/detectors.js';
import logger from '../utils/logger.js';
const router = express.Router();
const xaiExplainer = GraphXAIExplainer.getInstance();
const detectorService = DetectorService.getInstance();
// Committee requirement: All XAI operations require reason for access
router.use(requireReasonForAccess);
// Committee requirement: XAI explainer endpoints
router.post('/explain', requireAuthority('graph_xai_analysis', ['explanation', 'model_inference']), async (req, res) => {
    try {
        const { query, graph_data, explanation_type = 'node_importance', model_version = 'ga-core-1.0', context = {}, } = req.body;
        // Validate required fields
        if (!query || !graph_data) {
            return res.status(400).json({
                success: false,
                error: 'Query and graph_data are required for XAI explanation',
                code: 'MISSING_REQUIRED_FIELDS',
            });
        }
        const validExplanationTypes = [
            'node_importance',
            'edge_importance',
            'path_explanation',
            'subgraph_reasoning',
        ];
        if (!validExplanationTypes.includes(explanation_type)) {
            return res.status(400).json({
                success: false,
                error: `Invalid explanation type. Must be one of: ${validExplanationTypes.join(', ')}`,
                code: 'INVALID_EXPLANATION_TYPE',
            });
        }
        const user = req.user;
        const explanation = await xaiExplainer.generateExplanation({
            query,
            graph_data,
            explanation_type,
            model_version,
            context: {
                ...context,
                user_id: user.id,
                reason_for_access: req.reason_for_access?.reason,
            },
        });
        logger.info({
            message: 'XAI explanation generated for user',
            user_id: user.id,
            explanation_id: explanation.explanation_id,
            explanation_type,
            confidence: explanation.confidence,
            cached: explanation.cached,
        });
        res.json({
            success: true,
            explanation: {
                explanation_id: explanation.explanation_id,
                explanation_type: explanation.explanation_type,
                confidence: explanation.confidence,
                model_version: explanation.model_version,
                explanations: explanation.explanations,
                performance_metrics: explanation.performance_metrics,
                cached: explanation.cached,
                created_at: explanation.created_at,
            },
            message: 'XAI explanation generated successfully',
        });
    }
    catch (error) {
        logger.error({
            message: 'XAI explanation generation failed',
            error: error instanceof Error ? error.message : String(error),
            user_id: req.user?.id,
            explanation_type: req.body.explanation_type,
        });
        res.status(500).json({
            success: false,
            error: 'XAI explanation generation failed',
            code: 'EXPLANATION_ERROR',
        });
    }
});
// Committee requirement: Model cards endpoint
router.get('/model-cards/:version?', requireAuthority('graph_xai_analysis', ['model_card']), async (req, res) => {
    try {
        const { version } = req.params;
        if (version) {
            const modelCard = xaiExplainer.getModelCard(version);
            if (!modelCard) {
                return res.status(404).json({
                    success: false,
                    error: `Model card not found for version: ${version}`,
                    code: 'MODEL_CARD_NOT_FOUND',
                });
            }
            res.json({
                success: true,
                model_card: modelCard,
                message: `Model card retrieved for version ${version}`,
            });
        }
        else {
            // Return available model versions
            res.json({
                success: true,
                available_models: ['ga-core-1.0'],
                default_model: 'ga-core-1.0',
                message: 'Available XAI model versions',
            });
        }
    }
    catch (error) {
        logger.error({
            message: 'Model card retrieval failed',
            error: error instanceof Error ? error.message : String(error),
            user_id: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Model card retrieval failed',
            code: 'MODEL_CARD_ERROR',
        });
    }
});
// Committee requirement: Detector integration with XAI explanations
router.post('/detect', requireAuthority('graph_xai_analysis', ['detection', 'pattern_analysis']), async (req, res) => {
    try {
        const { data_source = 'api_request', graph_data, detection_types = ['anomaly_detection', 'pattern_matching'], sensitivity_level = 0.7, time_window, context = {}, } = req.body;
        if (!graph_data) {
            return res.status(400).json({
                success: false,
                error: 'Graph data is required for detection analysis',
                code: 'MISSING_GRAPH_DATA',
            });
        }
        const validDetectionTypes = [
            'anomaly_detection',
            'pattern_matching',
            'threat_detection',
            'behavioral_analysis',
            'temporal_clustering',
            'network_analysis',
        ];
        const invalidTypes = detection_types.filter((type) => !validDetectionTypes.includes(type));
        if (invalidTypes.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Invalid detection types: ${invalidTypes.join(', ')}`,
                valid_types: validDetectionTypes,
                code: 'INVALID_DETECTION_TYPES',
            });
        }
        const user = req.user;
        const detectionSummary = await detectorService.runDetectors({
            data_source,
            graph_data,
            detection_types,
            sensitivity_level,
            time_window: time_window
                ? {
                    start: new Date(time_window.start),
                    end: new Date(time_window.end),
                }
                : undefined,
            context: {
                ...context,
                user_id: user.id,
                reason_for_access: req.reason_for_access?.reason,
            },
        });
        logger.info({
            message: 'Detection analysis completed',
            user_id: user.id,
            total_detections: detectionSummary.total_detections,
            high_priority_count: detectionSummary.high_priority_detections.length,
            processing_time_ms: detectionSummary.processing_time_ms,
        });
        res.json({
            success: true,
            detection_summary: detectionSummary,
            message: `Detection analysis completed: ${detectionSummary.total_detections} detections found`,
        });
    }
    catch (error) {
        logger.error({
            message: 'Detection analysis failed',
            error: error instanceof Error ? error.message : String(error),
            user_id: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Detection analysis failed',
            code: 'DETECTION_ERROR',
        });
    }
});
// Committee requirement: XAI cache management
router.post('/cache/clear', requireAuthority('graph_xai_analysis', ['cache_management']), async (req, res) => {
    try {
        const user = req.user;
        if (user.clearance_level < 4) {
            return res.status(403).json({
                success: false,
                error: 'Cache management requires administrative clearance (level 4+)',
                code: 'INSUFFICIENT_CLEARANCE',
            });
        }
        xaiExplainer.clearCache();
        logger.info({
            message: 'XAI cache cleared by administrator',
            user_id: user.id,
            clearance_level: user.clearance_level,
        });
        res.json({
            success: true,
            message: 'XAI explanation cache cleared successfully',
        });
    }
    catch (error) {
        logger.error({
            message: 'Cache clear operation failed',
            error: error instanceof Error ? error.message : String(error),
            user_id: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Cache clear operation failed',
            code: 'CACHE_CLEAR_ERROR',
        });
    }
});
// Committee requirement: Cache statistics
router.get('/cache/stats', requireAuthority('graph_xai_analysis', ['cache_stats']), async (req, res) => {
    try {
        const cacheStats = xaiExplainer.getCacheStatistics();
        res.json({
            success: true,
            cache_statistics: cacheStats,
            timestamp: new Date().toISOString(),
            message: 'XAI cache statistics retrieved',
        });
    }
    catch (error) {
        logger.error({
            message: 'Cache statistics retrieval failed',
            error: error instanceof Error ? error.message : String(error),
            user_id: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Cache statistics retrieval failed',
            code: 'CACHE_STATS_ERROR',
        });
    }
});
// Enhanced explanation endpoint with batch processing
router.post('/explain/batch', requireAuthority('graph_xai_analysis', ['batch_explanation']), async (req, res) => {
    try {
        const { requests = [], model_version = 'ga-core-1.0' } = req.body;
        if (!Array.isArray(requests) || requests.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Requests array is required for batch explanation',
                code: 'MISSING_REQUESTS',
            });
        }
        if (requests.length > 10) {
            return res.status(400).json({
                success: false,
                error: 'Maximum 10 requests allowed per batch',
                code: 'BATCH_SIZE_EXCEEDED',
            });
        }
        const user = req.user;
        const results = [];
        const startTime = Date.now();
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            try {
                const explanation = await xaiExplainer.generateExplanation({
                    query: request.query,
                    graph_data: request.graph_data,
                    explanation_type: request.explanation_type || 'node_importance',
                    model_version,
                    context: {
                        ...request.context,
                        batch_index: i,
                        user_id: user.id,
                    },
                });
                results.push({
                    index: i,
                    success: true,
                    explanation: {
                        explanation_id: explanation.explanation_id,
                        confidence: explanation.confidence,
                        explanations: explanation.explanations.slice(0, 5), // Limit for batch
                        cached: explanation.cached,
                    },
                });
            }
            catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        const processingTime = Date.now() - startTime;
        logger.info({
            message: 'Batch XAI explanation completed',
            user_id: user.id,
            batch_size: requests.length,
            successful_explanations: results.filter((r) => r.success).length,
            processing_time_ms: processingTime,
        });
        res.json({
            success: true,
            batch_results: results,
            summary: {
                total_requests: requests.length,
                successful: results.filter((r) => r.success).length,
                failed: results.filter((r) => !r.success).length,
                processing_time_ms: processingTime,
            },
            message: 'Batch XAI explanation completed',
        });
    }
    catch (error) {
        logger.error({
            message: 'Batch XAI explanation failed',
            error: error instanceof Error ? error.message : String(error),
            user_id: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Batch XAI explanation failed',
            code: 'BATCH_EXPLANATION_ERROR',
        });
    }
});
// Health check for XAI services
router.get('/health', async (req, res) => {
    try {
        const cacheStats = xaiExplainer.getCacheStatistics();
        res.json({
            success: true,
            service: 'graph-xai',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            features: {
                explanation_generation: true,
                model_cards: true,
                detector_integration: true,
                cache_management: true,
                batch_processing: true,
            },
            cache_stats: cacheStats,
            available_models: ['ga-core-1.0'],
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            service: 'graph-xai',
            status: 'unhealthy',
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
export default router;
//# sourceMappingURL=xai.js.map