"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiffGenerator = void 0;
class DiffGenerator {
    generate(dryRunResult) {
        // In a real implementation, this would compare state or analyze the dry-run output object.
        // For now, we assume dryRunResult contains a description or structured change set.
        if (dryRunResult && dryRunResult.changes) {
            return {
                description: dryRunResult.description || 'Simulated execution',
                changes: dryRunResult.changes,
                riskLevel: dryRunResult.riskLevel || 'medium'
            };
        }
        return {
            description: typeof dryRunResult === 'string' ? dryRunResult : JSON.stringify(dryRunResult),
            changes: [{
                    path: 'root',
                    newValue: dryRunResult,
                    type: 'action'
                }],
            riskLevel: 'medium'
        };
    }
}
exports.DiffGenerator = DiffGenerator;
