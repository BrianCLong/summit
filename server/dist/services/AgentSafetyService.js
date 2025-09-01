import logger from '../config/logger.js';
async function policy_simulation(plan, context) {
    // TODO: integrate with OPA/ABAC engine in policies/
    // For now, pass-through with audit logging
    logger.info('Policy simulation (stub) executed', { planId: plan.id });
    return { passed: true, decisions: ['allow'] };
}
async function require_dual_control(plan) {
    // TODO: integrate with playbook_approvals gate for dual-control
    logger.info('Dual-control required (stub)', { planId: plan.id });
}
async function attest_accelerator() {
    // TODO: hook to GPU/driver attestation; return true/false
    logger.info('Accelerator attestation (stub)');
    return true;
}
async function sbom_check(artifacts) {
    // TODO: validate SBOM presence and signatures
    logger.info('SBOM check (stub)', { count: artifacts?.length || 0 });
    return true;
}
export async function execute_agent_plan(plan, context, run_playbook) {
    const sim = await policy_simulation(plan, context);
    if (!sim.passed)
        throw new Error('Policy simulation failed');
    if (plan.sensitivity === 'HIGH' || plan.sensitivity === 'CRITICAL') {
        await require_dual_control(plan);
        return Promise.reject(Object.assign(new Error('DUAL_CONTROL_REQUIRED'), { code: 'DUAL_CONTROL_REQUIRED' }));
    }
    const attested = await attest_accelerator();
    if (!attested)
        throw new Error('Accelerator attestation failed');
    const sbomOk = await sbom_check(plan.model_artifacts);
    if (!sbomOk)
        throw new Error('Model artifact SBOM check failed');
    return await run_playbook(plan);
}
export async function preflightAgentPlan(plan, context) {
    const sim = await policy_simulation(plan, context);
    if (!sim.passed)
        return { passed: false, requiresDualControl: false };
    const requiresDual = plan.sensitivity === 'HIGH' || plan.sensitivity === 'CRITICAL';
    await attest_accelerator();
    await sbom_check(plan.model_artifacts);
    return { passed: true, requiresDualControl: requiresDual };
}
//# sourceMappingURL=AgentSafetyService.js.map