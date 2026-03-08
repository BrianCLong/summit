"use strict";
/**
 * @intelgraph/knowledge-graph
 * Advanced knowledge graph construction with semantic understanding
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
exports.STANDARD_NAMESPACES = exports.GraphVisualization = exports.ExtractionPipeline = exports.KnowledgeFusion = exports.TemporalKnowledgeGraph = exports.GraphEmbeddings = exports.KnowledgeGraphManager = exports.OntologyManager = void 0;
// Types
__exportStar(require("./types/ontology.js"), exports);
__exportStar(require("./types/entity.js"), exports);
// Core managers
var OntologyManager_js_1 = require("./ontology/OntologyManager.js");
Object.defineProperty(exports, "OntologyManager", { enumerable: true, get: function () { return OntologyManager_js_1.OntologyManager; } });
var KnowledgeGraphManager_js_1 = require("./core/KnowledgeGraphManager.js");
Object.defineProperty(exports, "KnowledgeGraphManager", { enumerable: true, get: function () { return KnowledgeGraphManager_js_1.KnowledgeGraphManager; } });
// Embeddings
var GraphEmbeddings_js_1 = require("./embeddings/GraphEmbeddings.js");
Object.defineProperty(exports, "GraphEmbeddings", { enumerable: true, get: function () { return GraphEmbeddings_js_1.GraphEmbeddings; } });
// Temporal
var TemporalKnowledgeGraph_js_1 = require("./temporal/TemporalKnowledgeGraph.js");
Object.defineProperty(exports, "TemporalKnowledgeGraph", { enumerable: true, get: function () { return TemporalKnowledgeGraph_js_1.TemporalKnowledgeGraph; } });
// Fusion
var KnowledgeFusion_js_1 = require("./fusion/KnowledgeFusion.js");
Object.defineProperty(exports, "KnowledgeFusion", { enumerable: true, get: function () { return KnowledgeFusion_js_1.KnowledgeFusion; } });
// Extraction
var ExtractionPipeline_js_1 = require("./extraction/ExtractionPipeline.js");
Object.defineProperty(exports, "ExtractionPipeline", { enumerable: true, get: function () { return ExtractionPipeline_js_1.ExtractionPipeline; } });
// Visualization
var GraphVisualization_js_1 = require("./visualization/GraphVisualization.js");
Object.defineProperty(exports, "GraphVisualization", { enumerable: true, get: function () { return GraphVisualization_js_1.GraphVisualization; } });
// Re-export for convenience
var ontology_js_1 = require("./types/ontology.js");
Object.defineProperty(exports, "STANDARD_NAMESPACES", { enumerable: true, get: function () { return ontology_js_1.STANDARD_NAMESPACES; } });
