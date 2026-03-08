"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCapabilityRegistry = loadCapabilityRegistry;
exports.compileRegistry = compileRegistry;
exports.validateRegistry = validateRegistry;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = __importDefault(require("yaml"));
const REGISTRY_FILE_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);
function loadCapabilityRegistry(registryDir) {
    const files = node_fs_1.default
        .readdirSync(registryDir)
        .filter((file) => REGISTRY_FILE_EXTENSIONS.has(node_path_1.default.extname(file)))
        .map((file) => node_path_1.default.join(registryDir, file))
        .sort();
    const capabilities = [];
    let version = 1;
    for (const filePath of files) {
        const raw = node_fs_1.default.readFileSync(filePath, 'utf8');
        const parsed = filePath.endsWith('.json')
            ? JSON.parse(raw)
            : yaml_1.default.parse(raw);
        if (parsed.version) {
            version = parsed.version;
        }
        if (Array.isArray(parsed.capabilities)) {
            capabilities.push(...parsed.capabilities);
        }
    }
    return {
        version,
        capabilities: capabilities.sort((a, b) => a.capability_id.localeCompare(b.capability_id)),
    };
}
function compileRegistry(registry) {
    const capability_index = registry.capabilities.reduce((acc, capability) => {
        acc[capability.capability_id] = {
            data_classification: capability.data_classification,
            operations: capability.operations,
            policy_refs: capability.policy_refs ?? [],
            matchers: capability.matchers ?? [],
        };
        return acc;
    }, {});
    return {
        version: registry.version,
        capabilities: registry.capabilities,
        capability_index,
    };
}
function validateRegistry(registry, repoRoot) {
    const errors = [];
    const warnings = [];
    if (!registry.capabilities.length) {
        errors.push('No capabilities found in registry.');
    }
    const seen = new Set();
    for (const capability of registry.capabilities) {
        if (!capability.capability_id) {
            errors.push('Capability missing capability_id.');
            continue;
        }
        if (seen.has(capability.capability_id)) {
            errors.push(`Duplicate capability_id: ${capability.capability_id}`);
        }
        seen.add(capability.capability_id);
        if (!capability.name || !capability.description) {
            errors.push(`Capability ${capability.capability_id} missing name/description.`);
        }
        if (!capability.owner_team || !capability.repo || !capability.service) {
            errors.push(`Capability ${capability.capability_id} missing ownership metadata.`);
        }
        if (!capability.allowed_identities?.length) {
            errors.push(`Capability ${capability.capability_id} has no allowed_identities.`);
        }
        if (!capability.operations?.length) {
            errors.push(`Capability ${capability.capability_id} missing operations.`);
        }
        if (!capability.schemas?.input_schema_ref || !capability.schemas?.output_schema_ref) {
            warnings.push(`Capability ${capability.capability_id} missing schema references.`);
        }
        else {
            const inputSchemaPath = node_path_1.default.join(repoRoot, capability.schemas.input_schema_ref);
            const outputSchemaPath = node_path_1.default.join(repoRoot, capability.schemas.output_schema_ref);
            if (!node_fs_1.default.existsSync(inputSchemaPath)) {
                errors.push(`Missing input schema for ${capability.capability_id}: ${capability.schemas.input_schema_ref}`);
            }
            if (!node_fs_1.default.existsSync(outputSchemaPath)) {
                errors.push(`Missing output schema for ${capability.capability_id}: ${capability.schemas.output_schema_ref}`);
            }
        }
        if (!capability.policy_refs?.length) {
            warnings.push(`Capability ${capability.capability_id} has no policy_refs.`);
        }
        else {
            for (const policyRef of capability.policy_refs) {
                const policyPath = node_path_1.default.join(repoRoot, policyRef);
                if (!node_fs_1.default.existsSync(policyPath)) {
                    errors.push(`Missing policy ref for ${capability.capability_id}: ${policyRef}`);
                }
            }
        }
    }
    return { errors, warnings };
}
