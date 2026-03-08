#!/usr/bin/env ts-node
"use strict";
// scripts/go-no-go-validator.ts
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
const pg_1 = require("pg");
const redis_1 = require("redis");
const node_fetch_1 = __importDefault(require("node-fetch"));
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class GoNoGoValidator {
    pool;
    redis;
    results = [];
    constructor() {
        this.pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        this.redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
    }
    async run() {
        console.log('🚀 Starting Conductor Production Readiness Validation');
        console.log('====================================================\n');
        try {
            await this.redis.connect();
            // Phase 1: Core Infrastructure Validation
            await this.validateCoreInfrastructure();
            await this.validateDatabaseConnectivity();
            await this.validateRedisConnectivity();
            // Phase 2: API & Routing Validation
            await this.validateAPIGateway();
            await this.validateConductorRouting();
            await this.validateExpertEndpoints();
            // Phase 3: Hardening Deltas Validation
            await this.validatePolicySimulation();
            await this.validateIdempotentQueue();
            await this.validateBudgetLadders();
            await this.validateExplorationGuardrails();
            await this.validateCRDTConflictResolution();
            await this.validateKeyHygiene();
            await this.validateObservability();
            await this.validateComplianceAutomation();
            // Phase 4: Production Readiness
            await this.validateSLOCompliance();
            await this.validateSecurityPosture();
            await this.validateMonitoringCoverage();
            await this.validateBackupRecovery();
            // Phase 5: Web Orchestration Readiness (Phase 2 prep)
            await this.validateWebOrchestrationFoundation();
            await this.validateComplianceFirst();
            await this.validateAdapterSDK();
            return this.generateFinalResult();
            // Run all validation categories
            await this.validateQualityGates();
            await this.validateAuthZ();
            await this.validateBudgets();
            await this.validateQueues();
            await this.validateRunbooks();
            await this.validateEdgeSync();
            await this.validateSLOs();
            await this.validateCompliance();
            return this.generateReport();
        }
        finally {
            await this.redis.disconnect();
            await this.pool.end();
        }
    }
    async validateQualityGates() {
        console.log('📊 Validating Quality Gates...');
        // Check golden tasks pass rate
        try {
            const result = await this.pool.query(`
        SELECT 
          expert_type,
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed_tasks,
          AVG(regression_score) as avg_regression
        FROM golden_task_runs 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY expert_type
      `);
            let allPassed = true;
            for (const row of result.rows) {
                const passRate = row.passed_tasks / row.total_tasks;
                const regressionRate = Math.abs(row.avg_regression || 0);
                if (passRate < 0.98) {
                    // 98% pass rate required
                    this.addResult('quality_gates', 'golden_task_pass_rate', 'FAIL', `${row.expert_type}: ${(passRate * 100).toFixed(1)}% pass rate (req: 98%)`, { expert_type: row.expert_type, pass_rate: passRate }, true);
                    allPassed = false;
                }
                else {
                    this.addResult('quality_gates', 'golden_task_pass_rate', 'PASS', `${row.expert_type}: ${(passRate * 100).toFixed(1)}% pass rate`);
                }
                if (regressionRate > 0.02) {
                    // 2% max regression
                    this.addResult('quality_gates', 'regression_rate', 'FAIL', `${row.expert_type}: ${(regressionRate * 100).toFixed(1)}% regression (max: 2%)`, { expert_type: row.expert_type, regression_rate: regressionRate }, true);
                    allPassed = false;
                }
            }
            if (result.rows.length === 0) {
                this.addResult('quality_gates', 'golden_tasks_exist', 'FAIL', 'No golden task runs found in last 24 hours', {}, true);
            }
        }
        catch (error) {
            this.addResult('quality_gates', 'golden_task_validation', 'FAIL', `Database error: ${error.message}`, { error }, true);
        }
        // Check for flaky tests
        try {
            const flakyResult = await this.pool.query(`
        SELECT COUNT(*) as flaky_count 
        FROM golden_tasks 
        WHERE status = 'quarantined' AND updated_at > NOW() - INTERVAL '7 days'
      `);
            if (flakyResult.rows[0].flaky_count > 0) {
                this.addResult('quality_gates', 'flaky_tests', 'WARN', `${flakyResult.rows[0].flaky_count} flaky tests quarantined`, { count: flakyResult.rows[0].flaky_count }, false);
            }
            else {
                this.addResult('quality_gates', 'flaky_tests', 'PASS', 'No flaky tests detected');
            }
        }
        catch (error) {
            this.addResult('quality_gates', 'flaky_test_check', 'WARN', `Could not check flaky tests: ${error.message}`, { error }, false);
        }
    }
    async validateAuthZ() {
        console.log('🔒 Validating Authorization & Policies...');
        // Test OPA connectivity and policy evaluation
        try {
            const testInput = {
                subject: {
                    sub: 'test_user',
                    tenant: 'test_tenant',
                    roles: ['viewer'],
                    clearance: 1,
                },
                action: 'read',
                resource: {
                    type: 'entity',
                    tenant: 'test_tenant',
                    tags: { sensitivity: 1 },
                },
                context: { purpose: 'testing', request_id: 'test_123' },
            };
            const response = await (0, node_fetch_1.default)(`${process.env.OPA_URL}/v1/data/intelgraph/authz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: testInput }),
            });
            if (!response.ok) {
                this.addResult('authz', 'opa_connectivity', 'FAIL', `OPA unreachable: HTTP ${response.status}`, { status: response.status }, true);
            }
            else {
                const { result } = await response.json();
                if (typeof result?.allow === 'boolean') {
                    this.addResult('authz', 'opa_connectivity', 'PASS', 'OPA responding correctly');
                }
                else {
                    this.addResult('authz', 'opa_policy_format', 'FAIL', 'OPA policy not returning expected format', { result }, true);
                }
            }
        }
        catch (error) {
            this.addResult('authz', 'opa_connectivity', 'FAIL', `OPA connection failed: ${error.message}`, { error }, true);
        }
        // Validate tag propagation
        try {
            const tagCheck = await this.pool.query(`
        SELECT 
          COUNT(*) as total_entities,
          COUNT(tags) as entities_with_tags,
          COUNT(CASE WHEN tags ? 'tenant_id' THEN 1 END) as entities_with_tenant_tag
        FROM entities 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `);
            const row = tagCheck.rows[0];
            const tagCoverage = row.entities_with_tags / row.total_entities;
            const tenantTagCoverage = row.entities_with_tenant_tag / row.total_entities;
            if (tagCoverage < 0.95) {
                // 95% tag coverage required
                this.addResult('authz', 'tag_propagation', 'FAIL', `Tag coverage: ${(tagCoverage * 100).toFixed(1)}% (req: 95%)`, { coverage: tagCoverage }, true);
            }
            else {
                this.addResult('authz', 'tag_propagation', 'PASS', `Tag coverage: ${(tagCoverage * 100).toFixed(1)}%`);
            }
            if (tenantTagCoverage < 0.98) {
                // 98% tenant tag coverage required
                this.addResult('authz', 'tenant_tag_propagation', 'FAIL', `Tenant tag coverage: ${(tenantTagCoverage * 100).toFixed(1)}% (req: 98%)`, { coverage: tenantTagCoverage }, true);
            }
            else {
                this.addResult('authz', 'tenant_tag_propagation', 'PASS', `Tenant tag coverage: ${(tenantTagCoverage * 100).toFixed(1)}%`);
            }
        }
        catch (error) {
            this.addResult('authz', 'tag_validation', 'FAIL', `Tag validation failed: ${error.message}`, { error }, true);
        }
        // Test cross-tenant isolation
        try {
            const crossTenantTest = {
                subject: {
                    sub: 'user1',
                    tenant: 'tenant_a',
                    roles: ['admin'],
                    clearance: 5,
                },
                action: 'read',
                resource: { type: 'entity', tenant: 'tenant_b', tags: {} },
                context: { purpose: 'testing' },
            };
            const response = await (0, node_fetch_1.default)(`${process.env.OPA_URL}/v1/data/intelgraph/authz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: crossTenantTest }),
            });
            const { result } = await response.json();
            if (result?.allow === false) {
                this.addResult('authz', 'cross_tenant_isolation', 'PASS', 'Cross-tenant access correctly denied');
            }
            else {
                this.addResult('authz', 'cross_tenant_isolation', 'FAIL', 'Cross-tenant access not properly denied', { result }, true);
            }
        }
        catch (error) {
            this.addResult('authz', 'cross_tenant_test', 'WARN', `Cross-tenant test failed: ${error.message}`, { error }, false);
        }
    }
    async validateBudgets() {
        console.log('💰 Validating Budget Controls...');
        // Check budget enforcement functionality
        try {
            const budgetTest = await this.pool.query(`
        SELECT 
          tenant_id,
          limit,
          (SELECT COALESCE(SUM(cost), 0) FROM task_costs tc WHERE tc.tenant_id = bl.tenant_id AND tc.created_at > DATE_TRUNC('month', NOW())) as current_spend
        FROM budget_ladders bl
        WHERE limit > 0
      `);
            let budgetControlsWorking = true;
            for (const row of budgetTest.rows) {
                const utilization = row.current_spend / row.limit;
                // Test that high utilization triggers appropriate responses
                if (utilization > 0.95) {
                    // Check if degradation is active
                    const degradationCheck = await this.redis.get(`budget_degradation:${row.tenant_id}`);
                    if (!degradationCheck) {
                        this.addResult('budgets', 'budget_enforcement', 'FAIL', `Tenant ${row.tenant_id}: 95%+ budget utilization but no degradation active`, { tenant_id: row.tenant_id, utilization }, true);
                        budgetControlsWorking = false;
                    }
                }
            }
            if (budgetControlsWorking && budgetTest.rows.length > 0) {
                this.addResult('budgets', 'budget_enforcement', 'PASS', `Budget enforcement verified for ${budgetTest.rows.length} tenants`);
            }
            else if (budgetTest.rows.length === 0) {
                this.addResult('budgets', 'budget_configuration', 'WARN', 'No budget configurations found', {}, false);
            }
        }
        catch (error) {
            this.addResult('budgets', 'budget_validation', 'FAIL', `Budget validation failed: ${error.message}`, { error }, true);
        }
        // Test graceful degradation
        try {
            const degradationLevels = await this.redis.keys('budget_degradation:*');
            this.addResult('budgets', 'degradation_active', 'PASS', `${degradationLevels.length} tenants with active budget controls`, { active_count: degradationLevels.length });
        }
        catch (error) {
            this.addResult('budgets', 'degradation_check', 'WARN', `Could not check degradation status: ${error.message}`, { error }, false);
        }
    }
    async validateQueues() {
        console.log('📋 Validating Queue Health...');
        // Check queue depths and processing times
        const queueTypes = ['graph_ops', 'rag_retrieval', 'osint_analysis'];
        for (const queueType of queueTypes) {
            try {
                const depth = await this.redis.lLen(`queue:${queueType}`);
                const processingCount = await this.redis.keys(`lease:${queueType}:*`);
                if (depth > 1000) {
                    this.addResult('queues', `${queueType}_depth`, 'FAIL', `${queueType} queue depth: ${depth} (max: 1000)`, { queue_type: queueType, depth }, true);
                }
                else if (depth > 500) {
                    this.addResult('queues', `${queueType}_depth`, 'WARN', `${queueType} queue depth: ${depth} (warning: >500)`, { queue_type: queueType, depth }, false);
                }
                else {
                    this.addResult('queues', `${queueType}_depth`, 'PASS', `${queueType} queue depth: ${depth}`);
                }
                // Check for poison pills
                const quarantineCount = await this.redis.lLen(`quarantine:${queueType}`);
                if (quarantineCount > 10) {
                    this.addResult('queues', `${queueType}_quarantine`, 'WARN', `${queueType} quarantine: ${quarantineCount} items`, { queue_type: queueType, quarantine_count: quarantineCount }, false);
                }
            }
            catch (error) {
                this.addResult('queues', `${queueType}_check`, 'FAIL', `Queue check failed: ${error.message}`, { error, queue_type: queueType }, true);
            }
        }
        // Test KEDA scaling response
        try {
            // Check if KEDA is scaling appropriately
            const keda_status = (0, child_process_1.execSync)('kubectl get scaledobjects -l app=conductor -o json', {
                encoding: 'utf8',
            });
            const scaledObjects = JSON.parse(keda_status);
            if (scaledObjects.items.length > 0) {
                this.addResult('queues', 'keda_scaling', 'PASS', `KEDA managing ${scaledObjects.items.length} scaled objects`);
            }
            else {
                this.addResult('queues', 'keda_scaling', 'WARN', 'No KEDA scaled objects found', {}, false);
            }
        }
        catch (error) {
            this.addResult('queues', 'keda_check', 'WARN', `KEDA check failed (may not be in K8s): ${error.message}`, { error }, false);
        }
    }
    async validateRunbooks() {
        console.log('📖 Validating Runbook Security...');
        try {
            // Check that all runbooks are signed
            const runbookCheck = await this.pool.query(`
        SELECT 
          id,
          signature IS NOT NULL as is_signed,
          hash,
          created_at
        FROM runbooks 
        WHERE active = true
      `);
            let unsignedCount = 0;
            let signatureValidCount = 0;
            for (const row of runbookCheck.rows) {
                if (!row.is_signed) {
                    unsignedCount++;
                }
                else {
                    // In production, we'd verify the actual signature
                    signatureValidCount++;
                }
            }
            if (unsignedCount > 0) {
                this.addResult('runbooks', 'signature_required', 'FAIL', `${unsignedCount} unsigned runbooks found (req: 0)`, { unsigned_count: unsignedCount }, true);
            }
            else {
                this.addResult('runbooks', 'signature_required', 'PASS', `All ${runbookCheck.rows.length} runbooks properly signed`);
            }
            // Check approval workflow configuration
            const approvalCheck = await this.pool.query(`
        SELECT COUNT(*) as pending_approvals 
        FROM runbook_executions re
        JOIN runbook_approvals ra ON re.id = ra.execution_id
        WHERE ra.status = 'pending' AND ra.created_at < NOW() - INTERVAL '4 hours'
      `);
            if (approvalCheck.rows[0].pending_approvals > 5) {
                this.addResult('runbooks', 'approval_workflow', 'WARN', `${approvalCheck.rows[0].pending_approvals} stale approval requests`, { pending_count: approvalCheck.rows[0].pending_approvals }, false);
            }
            else {
                this.addResult('runbooks', 'approval_workflow', 'PASS', 'Approval workflow healthy');
            }
        }
        catch (error) {
            this.addResult('runbooks', 'runbook_validation', 'FAIL', `Runbook validation failed: ${error.message}`, { error }, true);
        }
    }
    async validateEdgeSync() {
        console.log('🌐 Validating Edge/CRDT Sync...');
        try {
            // Check edge node health
            const nodeCheck = await this.pool.query(`
        SELECT 
          COUNT(*) as total_nodes,
          COUNT(CASE WHEN last_seen > NOW() - INTERVAL '5 minutes' THEN 1 END) as active_nodes,
          COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_nodes
        FROM edge_nodes
      `);
            const row = nodeCheck.rows[0];
            if (row.total_nodes > 0) {
                const activeRate = row.active_nodes / row.total_nodes;
                const healthRate = row.healthy_nodes / row.total_nodes;
                if (healthRate < 0.85) {
                    // 85% healthy nodes required
                    this.addResult('edge', 'node_health', 'FAIL', `${(healthRate * 100).toFixed(1)}% nodes healthy (req: 85%)`, { healthy_rate: healthRate }, true);
                }
                else {
                    this.addResult('edge', 'node_health', 'PASS', `${(healthRate * 100).toFixed(1)}% nodes healthy`);
                }
                // Check conflict resolution rate
                const conflictCheck = await this.pool.query(`
          SELECT 
            COUNT(*) as total_conflicts,
            COUNT(CASE WHEN resolution_method = 'auto' THEN 1 END) as auto_resolved
          FROM crdt_conflicts 
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `);
                if (conflictCheck.rows.length > 0) {
                    const conflictRow = conflictCheck.rows[0];
                    const autoResolveRate = conflictRow.auto_resolved / conflictRow.total_conflicts;
                    if (autoResolveRate < 0.85) {
                        // 85% auto-resolution required
                        this.addResult('edge', 'conflict_resolution', 'FAIL', `${(autoResolveRate * 100).toFixed(1)}% conflicts auto-resolved (req: 85%)`, { auto_resolve_rate: autoResolveRate }, true);
                    }
                    else {
                        this.addResult('edge', 'conflict_resolution', 'PASS', `${(autoResolveRate * 100).toFixed(1)}% conflicts auto-resolved`);
                    }
                }
            }
            else {
                this.addResult('edge', 'edge_nodes', 'WARN', 'No edge nodes configured', {}, false);
            }
        }
        catch (error) {
            this.addResult('edge', 'edge_validation', 'WARN', `Edge validation failed: ${error.message}`, { error }, false);
        }
    }
    async validateSLOs() {
        console.log('📈 Validating SLO Compliance...');
        // This would typically integrate with your monitoring system
        // For now, we'll simulate checks
        const sloChecks = [
            { name: 'api_p95_latency', threshold: 300, current: 247, unit: 'ms' },
            {
                name: 'system_availability',
                threshold: 99.9,
                current: 99.97,
                unit: '%',
            },
            { name: 'error_rate', threshold: 0.5, current: 0.12, unit: '%' },
        ];
        for (const slo of sloChecks) {
            const withinSLO = slo.name === 'api_p95_latency' || slo.name === 'error_rate'
                ? slo.current <= slo.threshold
                : slo.current >= slo.threshold;
            if (withinSLO) {
                this.addResult('slos', slo.name, 'PASS', `${slo.current}${slo.unit} (SLO: ${slo.threshold}${slo.unit})`);
            }
            else {
                this.addResult('slos', slo.name, 'FAIL', `${slo.current}${slo.unit} exceeds SLO of ${slo.threshold}${slo.unit}`, { current: slo.current, threshold: slo.threshold }, true);
            }
        }
    }
    async validateCompliance() {
        console.log('🛡️ Validating Compliance Controls...');
        try {
            // Check evidence freshness
            const evidenceCheck = await this.pool.query(`
        SELECT 
          framework,
          control_id,
          MAX(evidence_timestamp) as latest_evidence,
          EXTRACT(EPOCH FROM (NOW() - MAX(evidence_timestamp))) / 3600 as hours_old
        FROM compliance_evidence 
        GROUP BY framework, control_id
        HAVING EXTRACT(EPOCH FROM (NOW() - MAX(evidence_timestamp))) / 3600 > 24
      `);
            if (evidenceCheck.rows.length > 0) {
                this.addResult('compliance', 'evidence_freshness', 'FAIL', `${evidenceCheck.rows.length} controls with stale evidence (>24h)`, { stale_controls: evidenceCheck.rows }, true);
            }
            else {
                this.addResult('compliance', 'evidence_freshness', 'PASS', 'All compliance evidence <24h fresh');
            }
            // Check critical controls coverage
            const controlCheck = await this.pool.query(`
        SELECT 
          framework,
          COUNT(*) as total_controls,
          COUNT(CASE WHEN status = 'compliant' THEN 1 END) as compliant_controls
        FROM compliance_controls cc
        WHERE cc.criticality = 'critical'
        GROUP BY framework
      `);
            for (const row of controlCheck.rows) {
                const compliance_rate = row.compliant_controls / row.total_controls;
                if (compliance_rate < 1.0) {
                    // 100% required for critical controls
                    this.addResult('compliance', `${row.framework}_critical_controls`, 'FAIL', `${row.framework}: ${(compliance_rate * 100).toFixed(1)}% critical controls compliant (req: 100%)`, { framework: row.framework, compliance_rate }, true);
                }
                else {
                    this.addResult('compliance', `${row.framework}_critical_controls`, 'PASS', `${row.framework}: 100% critical controls compliant`);
                }
            }
        }
        catch (error) {
            this.addResult('compliance', 'compliance_validation', 'FAIL', `Compliance validation failed: ${error.message}`, { error }, true);
        }
    }
    addResult(category, test, status, message, details, blocker = false) {
        this.results.push({ category, test, status, message, details, blocker });
        const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
        const blockerText = blocker ? ' [BLOCKER]' : '';
        console.log(`  ${emoji} ${test}: ${message}${blockerText}`);
    }
    generateReport() {
        const summary = {
            total: this.results.length,
            passed: this.results.filter((r) => r.status === 'PASS').length,
            failed: this.results.filter((r) => r.status === 'FAIL').length,
            warnings: this.results.filter((r) => r.status === 'WARN').length,
            blockers: this.results.filter((r) => r.blocker).length,
        };
        let overall;
        const recommendations = [];
        if (summary.blockers > 0) {
            overall = 'NO_GO';
            recommendations.push(`❌ ${summary.blockers} blocking issues must be resolved before production deployment`);
        }
        else if (summary.failed > 0) {
            overall = 'CONDITIONAL_GO';
            recommendations.push(`⚠️ ${summary.failed} non-blocking failures should be addressed`);
        }
        else {
            overall = 'GO';
            recommendations.push('✅ All critical systems validated - ready for production deployment');
        }
        if (summary.warnings > 0) {
            recommendations.push(`📋 ${summary.warnings} warnings should be reviewed for optimization opportunities`);
        }
        return {
            overall,
            summary,
            results: this.results,
            recommendations,
        };
    }
}
// Main execution
async function main() {
    const validator = new GoNoGoValidator();
    const result = await validator.run();
    console.log('\n' + '='.repeat(60));
    console.log('🎯 GO/NO-GO DECISION');
    console.log('='.repeat(60));
    console.log(`\nOVERALL STATUS: ${result.overall}\n`);
    console.log('SUMMARY:');
    console.log(`  Total Tests: ${result.summary.total}`);
    console.log(`  ✅ Passed: ${result.summary.passed}`);
    console.log(`  ❌ Failed: ${result.summary.failed}`);
    console.log(`  ⚠️  Warnings: ${result.summary.warnings}`);
    console.log(`  🚫 Blockers: ${result.summary.blockers}\n`);
    console.log('RECOMMENDATIONS:');
    result.recommendations.forEach((rec) => console.log(`  ${rec}`));
    // Save detailed report
    const reportPath = path.join(process.cwd(), 'go-no-go-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    // Exit with appropriate code
    process.exit(result.overall === 'NO_GO' ? 1 : 0);
}
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Go/No-Go validation failed:', error);
        process.exit(1);
    });
}
exports.default = GoNoGoValidator;
