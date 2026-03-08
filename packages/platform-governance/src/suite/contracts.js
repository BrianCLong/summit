"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractRegistry = exports.cloudEventSchema = exports.apiContractSchema = void 0;
exports.validateApiContract = validateApiContract;
exports.validateEventContract = validateEventContract;
exports.isApiContractCompatible = isApiContractCompatible;
exports.ensureIdempotentWrite = ensureIdempotentWrite;
exports.compareCloudEvents = compareCloudEvents;
exports.requireCanonicalModule = requireCanonicalModule;
const zod_1 = require("zod");
const domain_js_1 = require("./domain.js");
exports.apiContractSchema = zod_1.z.object({
    module: zod_1.z.enum(domain_js_1.canonicalModules),
    name: zod_1.z.string().min(3),
    version: zod_1.z.string().regex(/^v\d+$/),
    style: zod_1.z.union([zod_1.z.literal('rest'), zod_1.z.literal('grpc'), zod_1.z.literal('graphql')]),
    path: zod_1.z.string().min(1),
    idempotent: zod_1.z.boolean(),
    deprecated: zod_1.z.boolean().optional(),
    owner: zod_1.z.string().min(1),
    resources: zod_1.z.array(zod_1.z.string()).min(1),
    requestSchema: zod_1.z.unknown().optional(),
    responseSchema: zod_1.z.unknown().optional(),
    deprecationWindowDays: zod_1.z.number().int().positive().default(90),
    sla: zod_1.z.object({
        latencyMsP99: zod_1.z.number().int().positive(),
        availabilityPercent: zod_1.z.number().min(0).max(100),
        errorBudgetPercent: zod_1.z.number().min(0).max(100),
    }),
});
exports.cloudEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    source: zod_1.z.string(),
    type: zod_1.z.string(),
    specversion: zod_1.z.literal('1.0'),
    datacontenttype: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.unknown()),
    time: zod_1.z.string().optional(),
    subject: zod_1.z.string().optional(),
    tracing: zod_1.z.object({ traceId: zod_1.z.string(), spanId: zod_1.z.string() }).optional(),
    tenant_id: zod_1.z.string(),
    resource_id: zod_1.z.string(),
    provenance: zod_1.z.object({ emitter: zod_1.z.string(), version: zod_1.z.string(), domain: zod_1.z.string() }),
});
function validateApiContract(contract) {
    return exports.apiContractSchema.parse(contract);
}
function validateEventContract(event) {
    return exports.cloudEventSchema.parse(event);
}
function isApiContractCompatible(previous, next) {
    const reasons = [];
    if (previous.name !== next.name || previous.module !== next.module) {
        reasons.push('module or name mismatch');
    }
    if (previous.style !== next.style) {
        reasons.push('API style cannot change between versions');
    }
    const prevResources = new Set(previous.resources);
    const missingResources = Array.from(prevResources).filter((res) => !next.resources.includes(res));
    if (missingResources.length) {
        reasons.push(`missing resources in next version: ${missingResources.join(', ')}`);
    }
    if (next.deprecationWindowDays < previous.deprecationWindowDays) {
        reasons.push('deprecation window shortened');
    }
    if (next.sla.latencyMsP99 > previous.sla.latencyMsP99) {
        reasons.push('latency regression');
    }
    if (next.sla.availabilityPercent < previous.sla.availabilityPercent) {
        reasons.push('availability regression');
    }
    if (next.sla.errorBudgetPercent > previous.sla.errorBudgetPercent) {
        reasons.push('error budget enlarged');
    }
    return { compatible: reasons.length === 0, reasons };
}
function ensureIdempotentWrite(contract) {
    if (!contract.idempotent) {
        throw new Error(`Contract ${contract.name} must be idempotent for writes.`);
    }
}
function compareCloudEvents(previous, next) {
    const issues = [];
    const requiredKeys = ['tenant_id', 'resource_id', 'provenance'];
    requiredKeys.forEach((key) => {
        if (!(key in next)) {
            issues.push(`missing required field: ${String(key)}`);
        }
    });
    const prevDataKeys = Object.keys(previous.data ?? {});
    const missingDataKeys = prevDataKeys.filter((key) => !(key in next.data));
    if (missingDataKeys.length) {
        issues.push(`missing data fields: ${missingDataKeys.join(', ')}`);
    }
    return { compatible: issues.length === 0, issues };
}
class ContractRegistry {
    contracts = new Map();
    register(contract) {
        const parsedApi = validateApiContract(contract.api);
        contract.events.forEach(validateEventContract);
        const key = `${parsedApi.module}:${parsedApi.name}:${parsedApi.version}`;
        if (this.contracts.has(key)) {
            throw new Error(`Contract already registered for ${key}`);
        }
        this.contracts.set(key, { api: parsedApi, events: contract.events });
        return contract;
    }
    get(module, name, version) {
        return this.contracts.get(`${module}:${name}:${version}`);
    }
    list() {
        return Array.from(this.contracts.values());
    }
}
exports.ContractRegistry = ContractRegistry;
function requireCanonicalModule(value) {
    const module = domain_js_1.canonicalModules.find((m) => m === value);
    if (!module) {
        throw new Error(`Unknown canonical module: ${value}`);
    }
    return module;
}
