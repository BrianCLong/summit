"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationTwin = void 0;
const DiffGenerator_1 = require("./DiffGenerator");
class IntegrationTwin {
    diffGenerator;
    constructor() {
        this.diffGenerator = new DiffGenerator_1.DiffGenerator();
    }
    async simulate(connector, toolName, args, context) {
        if (!connector.dryRun) {
            // Fallback if dryRun is not supported?
            // Or throw error because safety is paramount.
            // For now, return a warning diff.
            return {
                description: `Connector ${connector.manifest.name} does not support dry-run. Execution would proceed blindly.`,
                changes: [],
                riskLevel: 'high'
            };
        }
        try {
            const dryRunResult = await connector.dryRun(toolName, args, context);
            return this.diffGenerator.generate(dryRunResult);
        }
        catch (error) {
            return {
                description: `Dry run failed: ${error.message}`,
                changes: [],
                riskLevel: 'high'
            };
        }
    }
}
exports.IntegrationTwin = IntegrationTwin;
