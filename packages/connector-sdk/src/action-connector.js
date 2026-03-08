"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionConnector = void 0;
const base_connector_1 = require("./base-connector");
class ActionConnector extends base_connector_1.BaseConnector {
    async execute(toolName, args, context) {
        this.ensureInitialized();
        // Simple retry logic can be added here or in the concrete implementation.
        // For now, delegating to implementation.
        return this.implementExecute(toolName, args, context);
    }
    async dryRun(toolName, args, context) {
        return {
            description: `[Dry Run] Would execute tool '${toolName}' on connector '${this.manifest.name}'`,
            args,
            estimatedImpact: 'unknown'
        };
    }
}
exports.ActionConnector = ActionConnector;
