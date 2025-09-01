export class ExecutionGuard {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    async runAll(ctx) {
        await this.deps.AttestationService.verifyGpuOrFail({ tenantId: ctx.tenantId });
        await this.deps.SBOMPolicy.checkOrFail({ tenantId: ctx.tenantId });
    }
}
//# sourceMappingURL=ExecutionGuard.js.map