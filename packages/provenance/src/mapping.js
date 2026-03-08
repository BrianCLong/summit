"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceMapping = void 0;
class ProvenanceMapping {
    /**
     * Maps a Receipt and additional metadata to the Sovereign OPA Input format.
     */
    static toSovereignInput(receipt, metadata = {}) {
        const sov = metadata.sovereign || {};
        return {
            operation: {
                isSovereign: metadata.isSovereign ?? false,
                name: metadata.operationName || 'unknown',
                affected_jurisdictions: metadata.affectedJurisdictions || ['US'],
                transcendence_level: metadata.transcendenceLevel,
                isCrossBorder: metadata.isCrossBorder ?? false,
            },
            actor: {
                role: receipt.actor.role || 'user',
            },
            verification: {
                independent_sources: (metadata.verifications || []).map((v) => ({
                    entity: v.entity,
                    timestamp_ns: v.timestamp_ns || Date.now() * 1000000,
                    signature_valid: v.signature_valid ?? false,
                    signature_algorithm: v.signature_algorithm || 'Ed25519',
                })),
            },
            containment: {
                emergency_stop: {
                    available: sov.emergencyStopAvailable ?? true,
                    response_time_ms: sov.emergencyStopResponseTimeMs ?? 50,
                },
                rollback: {
                    prepared: sov.rollbackPrepared ?? true,
                    max_time_seconds: sov.rollbackMaxTimeSeconds ?? 10,
                },
                isolation: {
                    network_ready: sov.isolationNetworkReady ?? true,
                    compute_ready: sov.isolationComputeReady ?? true,
                    data_ready: sov.isolationDataReady ?? true,
                },
                human_override: {
                    enabled: sov.humanOverrideEnabled ?? true,
                    authenticated_operator: receipt.actor.id,
                },
            },
            compliance: {
                jurisdictions: metadata.jurisdictionStatus || {
                    US: { status: 'COMPLIANT', last_check_ns: Date.now() * 1000000 },
                },
                continuous_checks: (metadata.continuousChecks || []).map((c) => ({
                    status: c.status || 'PASSING',
                    last_check_ns: c.last_check_ns || Date.now() * 1000000,
                })),
                overall_score: metadata.complianceScore ?? 1.0,
                violations: metadata.violations || [],
            },
            data_sovereignty: {
                requirements_met: sov.dataRequirementsMet ?? true,
                residency_verified: sov.dataResidencyVerified ?? true,
                purpose_compliant: sov.dataPurposeCompliant ?? true,
                retention_compliant: sov.dataRetentionCompliant ?? true,
            },
            cross_border_flows: (metadata.crossBorderFlows || []).map((f) => ({
                approval_status: f.status || 'APPROVED',
                approval_expiry_ns: f.expiry_ns || (Date.now() + 86400000) * 1000000,
                adequacy_decision_valid: f.adequacy_valid ?? true,
            })),
            autonomy: {
                reversibility: {
                    guaranteed: sov.reversibilityGuaranteed ?? true,
                    max_reversal_time_seconds: sov.reversalTimeSeconds ?? 30,
                    state_snapshots_available: sov.snapshotsAvailable ?? true,
                    snapshot_frequency_seconds: sov.snapshotFrequency ?? 300,
                    decision_trees_logged: sov.decisionTreesLogged ?? true,
                },
                human_control: {
                    intervention_available: sov.interventionAvailable ?? true,
                    override_time_ms: sov.overrideTimeMs ?? 200,
                    escalation_paths_defined: sov.escalationPathsDefined ?? true,
                    authorized_operators: sov.authorizedOperators || [receipt.actor.id],
                },
                scope: {
                    boundaries_defined: sov.boundariesDefined ?? true,
                    boundary_violations: sov.boundaryViolations ?? 0,
                    resource_limits_enforced: sov.resourceLimitsEnforced ?? true,
                    capability_restrictions_active: sov.capabilityRestrictionsActive ?? true,
                },
            },
            monitoring: {
                real_time_active: sov.monitorActive ?? true,
                last_heartbeat_ns: Date.now() * 1000000,
                anomaly_detection_active: sov.anomalyDetectionActive ?? true,
                performance_metrics_active: sov.performanceMetricsActive ?? true,
            },
            audit: {
                decision_logging_complete: sov.auditDecisionLogged ?? true,
                cryptographic_integrity: sov.auditCryptoIntegrity ?? true,
                multi_jurisdiction_capable: sov.auditMultiJurisdiction ?? true,
                real_time_feed_active: sov.auditRealTimeFeed ?? true,
            },
        };
    }
}
exports.ProvenanceMapping = ProvenanceMapping;
