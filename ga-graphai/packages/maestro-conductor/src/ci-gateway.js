"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CiGateway = void 0;
class CiGateway {
    checks = [];
    register(check) {
        this.checks.push(check);
    }
    list() {
        return [...this.checks];
    }
    async evaluate(task) {
        const results = [];
        for (const check of this.checks) {
            try {
                const result = await check.evaluate(task);
                results.push({
                    id: check.id,
                    description: check.description,
                    required: check.required ?? true,
                    passed: result.passed,
                    detail: result.detail,
                    metadata: result.metadata ?? {},
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'unknown ci gate error';
                results.push({
                    id: check.id,
                    description: check.description,
                    required: check.required ?? true,
                    passed: false,
                    detail: 'ci check execution failed',
                    metadata: { error },
                    error: message,
                });
            }
        }
        return results;
    }
}
exports.CiGateway = CiGateway;
