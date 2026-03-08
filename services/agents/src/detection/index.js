"use strict";
/**
 * Anomaly Detection Module
 *
 * Unsupervised anomaly detection system for OSINT/CTI outlier detection
 * over Neo4j and pgvector data streams.
 *
 * Features:
 * - Isolation Forest for feature-based anomaly detection
 * - Graph Diffusion for network-based anomaly detection
 * - Real-time stream processing from Redis
 * - Agentic alerting with escalation and auto-investigation
 *
 * Performance targets:
 * - 91% precision
 * - p95 latency < 500ms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyDetectionService = exports.AlertingAgent = exports.StreamProcessor = exports.GraphDiffusionDetector = exports.IsolationForestDetector = void 0;
var IsolationForestDetector_js_1 = require("./IsolationForestDetector.js");
Object.defineProperty(exports, "IsolationForestDetector", { enumerable: true, get: function () { return IsolationForestDetector_js_1.IsolationForestDetector; } });
var GraphDiffusionDetector_js_1 = require("./GraphDiffusionDetector.js");
Object.defineProperty(exports, "GraphDiffusionDetector", { enumerable: true, get: function () { return GraphDiffusionDetector_js_1.GraphDiffusionDetector; } });
var StreamProcessor_js_1 = require("./StreamProcessor.js");
Object.defineProperty(exports, "StreamProcessor", { enumerable: true, get: function () { return StreamProcessor_js_1.StreamProcessor; } });
var AlertingAgent_js_1 = require("./AlertingAgent.js");
Object.defineProperty(exports, "AlertingAgent", { enumerable: true, get: function () { return AlertingAgent_js_1.AlertingAgent; } });
var AnomalyDetectionService_js_1 = require("./AnomalyDetectionService.js");
Object.defineProperty(exports, "AnomalyDetectionService", { enumerable: true, get: function () { return AnomalyDetectionService_js_1.AnomalyDetectionService; } });
