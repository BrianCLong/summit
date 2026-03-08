"use strict";
/**
 * Multimodal Fusion Pipeline
 * Agentic fusion of OSINT text/images/video into Neo4j embeddings
 *
 * @module @intelgraph/multimodal-fusion
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
exports.HallucinationGuard = exports.Neo4jEmbeddings = exports.PgVectorStore = exports.FusionOrchestrator = exports.VideoPipeline = exports.TextPipeline = exports.CLIPPipeline = void 0;
exports.createOSINTFusionPipeline = createOSINTFusionPipeline;
exports.createLightweightFusionPipeline = createLightweightFusionPipeline;
// Core Types
__exportStar(require("./types.js"), exports);
// Pipeline Components
var clip_pipeline_js_1 = require("./clip-pipeline.js");
Object.defineProperty(exports, "CLIPPipeline", { enumerable: true, get: function () { return clip_pipeline_js_1.CLIPPipeline; } });
var text_pipeline_js_1 = require("./text-pipeline.js");
Object.defineProperty(exports, "TextPipeline", { enumerable: true, get: function () { return text_pipeline_js_1.TextPipeline; } });
var video_pipeline_js_1 = require("./video-pipeline.js");
Object.defineProperty(exports, "VideoPipeline", { enumerable: true, get: function () { return video_pipeline_js_1.VideoPipeline; } });
// Fusion Orchestration
var fusion_orchestrator_js_1 = require("./fusion-orchestrator.js");
Object.defineProperty(exports, "FusionOrchestrator", { enumerable: true, get: function () { return fusion_orchestrator_js_1.FusionOrchestrator; } });
// Storage and Retrieval
var pgvector_store_js_1 = require("./pgvector-store.js");
Object.defineProperty(exports, "PgVectorStore", { enumerable: true, get: function () { return pgvector_store_js_1.PgVectorStore; } });
var neo4j_embeddings_js_1 = require("./neo4j-embeddings.js");
Object.defineProperty(exports, "Neo4jEmbeddings", { enumerable: true, get: function () { return neo4j_embeddings_js_1.Neo4jEmbeddings; } });
// Hallucination Detection
var hallucination_guard_js_1 = require("./hallucination-guard.js");
Object.defineProperty(exports, "HallucinationGuard", { enumerable: true, get: function () { return hallucination_guard_js_1.HallucinationGuard; } });
// Convenience factory function
const fusion_orchestrator_js_2 = require("./fusion-orchestrator.js");
/**
 * Create a pre-configured fusion pipeline for OSINT analysis
 */
function createOSINTFusionPipeline(config = {}) {
    return new fusion_orchestrator_js_2.FusionOrchestrator({
        fusionMethod: 'weighted_average',
        targetDimension: 768,
        enableGraphEmbeddings: true,
        enablePgVectorStorage: true,
        enableHallucinationGuard: true,
        hallucinationThreshold: 0.7,
        crossModalThreshold: 0.6,
        parallelProcessing: true,
        maxConcurrency: 4,
        ...config,
    });
}
/**
 * Create a lightweight fusion pipeline (no external dependencies)
 */
function createLightweightFusionPipeline(config = {}) {
    return new fusion_orchestrator_js_2.FusionOrchestrator({
        fusionMethod: 'average',
        targetDimension: 768,
        enableGraphEmbeddings: false,
        enablePgVectorStorage: false,
        enableHallucinationGuard: true,
        parallelProcessing: true,
        maxConcurrency: 2,
        ...config,
    });
}
// Default export
exports.default = fusion_orchestrator_js_2.FusionOrchestrator;
