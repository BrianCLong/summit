"use strict";
// @ts-nocheck
// Governance Analytics Module Index
// Exports all governance analytics components for use across the platform
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
exports.governanceRoutes = exports.governanceMetricsResolvers = exports.governanceMetricsTypeDefs = exports.getAllQueries = exports.buildPrometheusRangeQuery = exports.buildPrometheusInstantQuery = exports.PERFORMANCE_QUERIES = exports.RISK_QUERIES = exports.MODEL_GOVERNANCE_QUERIES = exports.COMPLIANCE_QUERIES = exports.INCIDENT_QUERIES = exports.VALIDATION_QUERIES = exports.governanceRiskScoreGauge = exports.governanceComplianceGapsGauge = exports.governanceValidationRateGauge = exports.governanceMetricsRefreshLatency = exports.governanceDashboardLatency = exports.governanceMetricsService = exports.createGovernanceMetricsService = exports.GovernanceMetricsService = void 0;
__exportStar(require("./types.js"), exports);
__exportStar(require("./prometheus-queries.js"), exports);
__exportStar(require("./governance-metrics-service.js"), exports);
__exportStar(require("./graphql-schema.js"), exports);
// Re-export commonly used items for convenience
var governance_metrics_service_js_1 = require("./governance-metrics-service.js");
Object.defineProperty(exports, "GovernanceMetricsService", { enumerable: true, get: function () { return governance_metrics_service_js_1.GovernanceMetricsService; } });
Object.defineProperty(exports, "createGovernanceMetricsService", { enumerable: true, get: function () { return governance_metrics_service_js_1.createGovernanceMetricsService; } });
Object.defineProperty(exports, "governanceMetricsService", { enumerable: true, get: function () { return governance_metrics_service_js_1.governanceMetricsService; } });
Object.defineProperty(exports, "governanceDashboardLatency", { enumerable: true, get: function () { return governance_metrics_service_js_1.governanceDashboardLatency; } });
Object.defineProperty(exports, "governanceMetricsRefreshLatency", { enumerable: true, get: function () { return governance_metrics_service_js_1.governanceMetricsRefreshLatency; } });
Object.defineProperty(exports, "governanceValidationRateGauge", { enumerable: true, get: function () { return governance_metrics_service_js_1.governanceValidationRateGauge; } });
Object.defineProperty(exports, "governanceComplianceGapsGauge", { enumerable: true, get: function () { return governance_metrics_service_js_1.governanceComplianceGapsGauge; } });
Object.defineProperty(exports, "governanceRiskScoreGauge", { enumerable: true, get: function () { return governance_metrics_service_js_1.governanceRiskScoreGauge; } });
var prometheus_queries_js_1 = require("./prometheus-queries.js");
Object.defineProperty(exports, "VALIDATION_QUERIES", { enumerable: true, get: function () { return prometheus_queries_js_1.VALIDATION_QUERIES; } });
Object.defineProperty(exports, "INCIDENT_QUERIES", { enumerable: true, get: function () { return prometheus_queries_js_1.INCIDENT_QUERIES; } });
Object.defineProperty(exports, "COMPLIANCE_QUERIES", { enumerable: true, get: function () { return prometheus_queries_js_1.COMPLIANCE_QUERIES; } });
Object.defineProperty(exports, "MODEL_GOVERNANCE_QUERIES", { enumerable: true, get: function () { return prometheus_queries_js_1.MODEL_GOVERNANCE_QUERIES; } });
Object.defineProperty(exports, "RISK_QUERIES", { enumerable: true, get: function () { return prometheus_queries_js_1.RISK_QUERIES; } });
Object.defineProperty(exports, "PERFORMANCE_QUERIES", { enumerable: true, get: function () { return prometheus_queries_js_1.PERFORMANCE_QUERIES; } });
Object.defineProperty(exports, "buildPrometheusInstantQuery", { enumerable: true, get: function () { return prometheus_queries_js_1.buildPrometheusInstantQuery; } });
Object.defineProperty(exports, "buildPrometheusRangeQuery", { enumerable: true, get: function () { return prometheus_queries_js_1.buildPrometheusRangeQuery; } });
Object.defineProperty(exports, "getAllQueries", { enumerable: true, get: function () { return prometheus_queries_js_1.getAllQueries; } });
var graphql_schema_js_1 = require("./graphql-schema.js");
Object.defineProperty(exports, "governanceMetricsTypeDefs", { enumerable: true, get: function () { return graphql_schema_js_1.governanceMetricsTypeDefs; } });
Object.defineProperty(exports, "governanceMetricsResolvers", { enumerable: true, get: function () { return graphql_schema_js_1.governanceMetricsResolvers; } });
var routes_js_1 = require("./routes.js");
Object.defineProperty(exports, "governanceRoutes", { enumerable: true, get: function () { return routes_js_1.governanceRoutes; } });
