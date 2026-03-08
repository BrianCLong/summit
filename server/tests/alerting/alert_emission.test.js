"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const metrics_enhanced_js_1 = require("../../src/observability/metrics-enhanced.js");
(0, globals_1.describe)('Alert Emission Metrics', () => {
    (0, globals_1.beforeEach)(() => {
        metrics_enhanced_js_1.registry.clear();
    });
    (0, globals_1.it)('should emit KillSwitchActive metric', async () => {
        metrics_enhanced_js_1.killSwitchStatus.labels('global_kill_switch', 'global').set(1);
        const metrics = await metrics_enhanced_js_1.registry.metrics();
        (0, globals_1.expect)(metrics).toContain('intelgraph_kill_switch_active{switch_id="global_kill_switch",scope="global"} 1');
    });
    (0, globals_1.it)('should emit CrossTenantAccessAttempts metric', async () => {
        metrics_enhanced_js_1.crossTenantAccessAttempts.labels('tenantA', 'tenantB', 'document:123').inc();
        const metrics = await metrics_enhanced_js_1.registry.metrics();
        (0, globals_1.expect)(metrics).toContain('intelgraph_security_cross_tenant_access_denied_total{source_tenant="tenantA",target_tenant="tenantB",resource="document:123"} 1');
    });
    (0, globals_1.it)('should emit AgentRunawayLoop metric', async () => {
        metrics_enhanced_js_1.agentLoopIterations.labels('agent-123', 'research').observe(60);
        const metrics = await metrics_enhanced_js_1.registry.metrics();
        (0, globals_1.expect)(metrics).toContain('intelgraph_agent_loop_iterations_bucket{le="100",agent_id="agent-123",task_type="research"} 1');
        (0, globals_1.expect)(metrics).toContain('intelgraph_agent_loop_iterations_sum{agent_id="agent-123",task_type="research"} 60');
    });
});
