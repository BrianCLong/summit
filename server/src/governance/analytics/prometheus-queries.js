"use strict";
// Prometheus Query Definitions for AI Governance Metrics
// These queries feed the governance dashboard with real-time metrics
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERFORMANCE_QUERIES = exports.RISK_QUERIES = exports.MODEL_GOVERNANCE_QUERIES = exports.COMPLIANCE_QUERIES = exports.INCIDENT_QUERIES = exports.VALIDATION_QUERIES = void 0;
exports.buildPrometheusRangeQuery = buildPrometheusRangeQuery;
exports.buildPrometheusInstantQuery = buildPrometheusInstantQuery;
exports.getAllQueries = getAllQueries;
/**
 * ODNI Validation Tracking Queries
 * Tracks the 85% validation requirement
 */
exports.VALIDATION_QUERIES = {
    validationRate: {
        name: 'ai_decisions_validation_rate',
        query: `
      sum(rate(ai_decisions_validated_total[1h])) /
      sum(rate(ai_decisions_total[1h])) * 100
    `,
        description: 'AI decision validation rate (ODNI 85% target)',
        unit: 'percent',
        aggregation: 'instant',
    },
    validatedDecisions: {
        name: 'ai_decisions_validated_total',
        query: `sum(increase(ai_decisions_validated_total[24h]))`,
        description: 'Total validated AI decisions in last 24h',
        unit: 'count',
        aggregation: 'instant',
    },
    totalDecisions: {
        name: 'ai_decisions_total',
        query: `sum(increase(ai_decisions_total[24h]))`,
        description: 'Total AI decisions in last 24h',
        unit: 'count',
        aggregation: 'instant',
    },
    validationByCategory: {
        name: 'ai_decisions_validation_by_category',
        query: `
      sum by (category) (rate(ai_decisions_validated_total[1h])) /
      sum by (category) (rate(ai_decisions_total[1h])) * 100
    `,
        description: 'Validation rate broken down by decision category',
        unit: 'percent',
        aggregation: 'instant',
    },
    validationTrend: {
        name: 'ai_decisions_validation_trend',
        query: `
      sum(rate(ai_decisions_validated_total[1h])) /
      sum(rate(ai_decisions_total[1h])) * 100
    `,
        description: 'Validation rate over time',
        unit: 'percent',
        aggregation: 'range',
    },
};
/**
 * Incident Trend Queries
 */
exports.INCIDENT_QUERIES = {
    totalIncidents: {
        name: 'governance_incidents_total',
        query: `sum(increase(governance_incidents_total[24h]))`,
        description: 'Total governance incidents in last 24h',
        unit: 'count',
        aggregation: 'instant',
    },
    incidentsBySeverity: {
        name: 'governance_incidents_by_severity',
        query: `sum by (severity) (increase(governance_incidents_total[24h]))`,
        description: 'Incidents by severity level',
        unit: 'count',
        aggregation: 'instant',
    },
    incidentsByCategory: {
        name: 'governance_incidents_by_category',
        query: `sum by (category) (increase(governance_incidents_total[24h]))`,
        description: 'Incidents by category',
        unit: 'count',
        aggregation: 'instant',
    },
    mttr: {
        name: 'governance_incident_resolution_seconds',
        query: `
      histogram_quantile(0.95,
        sum(rate(governance_incident_resolution_seconds_bucket[24h])) by (le)
      )
    `,
        description: 'P95 incident resolution time',
        unit: 'seconds',
        aggregation: 'instant',
    },
    incidentTimeline: {
        name: 'governance_incidents_timeline',
        query: `sum(increase(governance_incidents_total[1h]))`,
        description: 'Incident count over time',
        unit: 'count',
        aggregation: 'range',
    },
    openIncidents: {
        name: 'governance_incidents_open',
        query: `sum(governance_incidents_open_total)`,
        description: 'Currently open incidents',
        unit: 'count',
        aggregation: 'instant',
    },
    resolvedIncidents: {
        name: 'governance_incidents_resolved',
        query: `sum(increase(governance_incidents_resolved_total[24h]))`,
        description: 'Resolved incidents in last 24h',
        unit: 'count',
        aggregation: 'instant',
    },
};
/**
 * Compliance Gap Queries
 */
exports.COMPLIANCE_QUERIES = {
    complianceScore: {
        name: 'compliance_score_percent',
        query: `avg(compliance_requirement_score_percent)`,
        description: 'Overall compliance score',
        unit: 'percent',
        aggregation: 'instant',
    },
    gapCount: {
        name: 'compliance_gaps_total',
        query: `sum(compliance_gaps_open_total)`,
        description: 'Total open compliance gaps',
        unit: 'count',
        aggregation: 'instant',
    },
    gapsBySeverity: {
        name: 'compliance_gaps_by_severity',
        query: `sum by (severity) (compliance_gaps_open_total)`,
        description: 'Open gaps by severity',
        unit: 'count',
        aggregation: 'instant',
    },
    gapsByFramework: {
        name: 'compliance_gaps_by_framework',
        query: `sum by (framework) (compliance_gaps_open_total)`,
        description: 'Open gaps by compliance framework',
        unit: 'count',
        aggregation: 'instant',
    },
    remediationProgress: {
        name: 'compliance_remediation_progress',
        query: `
      sum(compliance_gaps_remediated_total) /
      (sum(compliance_gaps_remediated_total) + sum(compliance_gaps_open_total)) * 100
    `,
        description: 'Remediation progress percentage',
        unit: 'percent',
        aggregation: 'instant',
    },
    complianceTrend: {
        name: 'compliance_score_trend',
        query: `avg(compliance_requirement_score_percent)`,
        description: 'Compliance score over time',
        unit: 'percent',
        aggregation: 'range',
    },
};
/**
 * Model Governance Queries
 */
exports.MODEL_GOVERNANCE_QUERIES = {
    totalModels: {
        name: 'ai_models_total',
        query: `sum(ai_models_registered_total)`,
        description: 'Total registered AI models',
        unit: 'count',
        aggregation: 'instant',
    },
    modelsByStatus: {
        name: 'ai_models_by_status',
        query: `sum by (status) (ai_models_registered_total)`,
        description: 'Models by approval status',
        unit: 'count',
        aggregation: 'instant',
    },
    modelsByRiskTier: {
        name: 'ai_models_by_risk_tier',
        query: `sum by (risk_tier) (ai_models_registered_total)`,
        description: 'Models by risk tier',
        unit: 'count',
        aggregation: 'instant',
    },
    deploymentSuccess: {
        name: 'ai_model_deployments_success_rate',
        query: `
      sum(rate(ai_model_deployments_success_total[24h])) /
      sum(rate(ai_model_deployments_total[24h])) * 100
    `,
        description: 'Model deployment success rate',
        unit: 'percent',
        aggregation: 'instant',
    },
    biasAudits: {
        name: 'ai_model_bias_audits_total',
        query: `sum(increase(ai_model_bias_audits_total[30d]))`,
        description: 'Bias audits performed in last 30 days',
        unit: 'count',
        aggregation: 'instant',
    },
    biasDetections: {
        name: 'ai_model_bias_detections_total',
        query: `sum(increase(ai_model_bias_detections_total[30d]))`,
        description: 'Bias issues detected in last 30 days',
        unit: 'count',
        aggregation: 'instant',
    },
};
/**
 * Risk Score Queries
 */
exports.RISK_QUERIES = {
    overallRisk: {
        name: 'governance_risk_score',
        query: `avg(governance_risk_score_percent)`,
        description: 'Overall governance risk score',
        unit: 'percent',
        aggregation: 'instant',
    },
    riskByComponent: {
        name: 'governance_risk_by_component',
        query: `avg by (component) (governance_risk_score_percent)`,
        description: 'Risk score by component',
        unit: 'percent',
        aggregation: 'instant',
    },
    riskTrend: {
        name: 'governance_risk_trend',
        query: `avg(governance_risk_score_percent)`,
        description: 'Risk score over time',
        unit: 'percent',
        aggregation: 'range',
    },
};
/**
 * Performance Queries (for p95 < 2s SLA)
 */
exports.PERFORMANCE_QUERIES = {
    dashboardLatencyP95: {
        name: 'governance_dashboard_latency_p95',
        query: `
      histogram_quantile(0.95,
        sum(rate(governance_dashboard_request_duration_seconds_bucket[5m])) by (le)
      )
    `,
        description: 'Dashboard P95 latency',
        unit: 'seconds',
        aggregation: 'instant',
    },
    metricsRefreshLatency: {
        name: 'governance_metrics_refresh_latency',
        query: `
      histogram_quantile(0.95,
        sum(rate(governance_metrics_refresh_duration_seconds_bucket[5m])) by (le)
      )
    `,
        description: 'Metrics refresh P95 latency',
        unit: 'seconds',
        aggregation: 'instant',
    },
};
/**
 * Build a Prometheus range query URL
 */
function buildPrometheusRangeQuery(baseUrl, query, startTime, endTime, step = '1h') {
    const params = new URLSearchParams({
        query,
        start: (startTime / 1000).toFixed(0),
        end: (endTime / 1000).toFixed(0),
        step,
    });
    return `${baseUrl}/api/v1/query_range?${params.toString()}`;
}
/**
 * Build a Prometheus instant query URL
 */
function buildPrometheusInstantQuery(baseUrl, query, time) {
    const params = new URLSearchParams({ query });
    if (time) {
        params.set('time', (time / 1000).toFixed(0));
    }
    return `${baseUrl}/api/v1/query?${params.toString()}`;
}
/**
 * Get all queries for a specific domain
 */
function getAllQueries() {
    return {
        ...exports.VALIDATION_QUERIES,
        ...exports.INCIDENT_QUERIES,
        ...exports.COMPLIANCE_QUERIES,
        ...exports.MODEL_GOVERNANCE_QUERIES,
        ...exports.RISK_QUERIES,
        ...exports.PERFORMANCE_QUERIES,
    };
}
