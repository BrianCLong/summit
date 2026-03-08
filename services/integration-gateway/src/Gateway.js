"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Gateway = void 0;
const crypto_1 = require("crypto");
class Gateway {
    registry;
    mandateService;
    twin;
    constructor(registry, mandateService, twin) {
        this.registry = registry;
        this.mandateService = mandateService;
        this.twin = twin;
    }
    async dryRun(mandateId, toolName, args, context = {}) {
        // 1. Verify Mandate
        const mandateResult = this.mandateService.verifyMandate(mandateId, { type: 'intent', value: toolName });
        if (!mandateResult.valid) {
            return { allowed: false, reason: mandateResult.reason };
        }
        const connector = this.registry.getConnectorForTool(toolName);
        if (!connector) {
            return { allowed: false, reason: `Tool '${toolName}' not found` };
        }
        // 2. Run Twin Simulation
        const diff = await this.twin.simulate(connector, toolName, args, this.createContext(context));
        return { allowed: true, diff };
    }
    async execute(mandateId, toolName, args, context = {}) {
        const provenanceId = (0, crypto_1.randomUUID)();
        // 1. Verify Mandate
        const mandateResult = this.mandateService.verifyMandate(mandateId, { type: 'intent', value: toolName });
        if (!mandateResult.valid) {
            return { success: false, error: mandateResult.reason, provenanceId };
        }
        const connector = this.registry.getConnectorForTool(toolName);
        if (!connector) {
            return { success: false, error: `Tool '${toolName}' not found`, provenanceId };
        }
        // 2. Execute
        try {
            if (!connector.execute) {
                return { success: false, error: `Connector '${connector.manifest.name}' does not support execution`, provenanceId };
            }
            const result = await connector.execute(toolName, args, this.createContext(context));
            // 3. Record Provenance (Mocked for now)
            console.log(`[Provenance] Recorded action ${toolName} with mandate ${mandateId}. Result: Success.`);
            return { success: true, result, provenanceId };
        }
        catch (error) {
            console.error(`[Provenance] Recorded failed action ${toolName} with mandate ${mandateId}. Error: ${error.message}`);
            return { success: false, error: error.message, provenanceId };
        }
    }
    createContext(baseContext) {
        // Mocking context
        return {
            logger: console,
            metrics: {
                increment: () => { },
                gauge: () => { },
                histogram: () => { },
                timing: () => { }
            },
            rateLimiter: {
                acquire: async () => { },
                isLimited: () => false,
                remaining: () => 100
            },
            stateStore: {
                get: async () => null,
                set: async () => { },
                delete: async () => { },
                getCursor: async () => null,
                setCursor: async () => { }
            },
            emitter: {
                emitEntity: async () => { },
                emitRelationship: async () => { },
                emitEntities: async () => { },
                emitRelationships: async () => { },
                flush: async () => { }
            },
            signal: new AbortController().signal,
            ...baseContext
        };
    }
}
exports.Gateway = Gateway;
