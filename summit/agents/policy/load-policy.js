"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicyFromFile = loadPolicyFromFile;
exports.normalizePolicy = normalizePolicy;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const schemaPath = node_path_1.default.resolve(node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url)), "policy.schema.json");
const schema = JSON.parse(node_fs_1.default.readFileSync(schemaPath, "utf8"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
function loadPolicyFromFile(filePath) {
    const raw = node_fs_1.default.readFileSync(filePath, "utf8");
    const parsed = js_yaml_1.default.load(raw);
    if (!validate(parsed)) {
        const details = (validate.errors ?? [])
            .map((e) => `${e.instancePath || "/"} ${e.message}`)
            .join("; ");
        throw new Error(`Invalid policy file: ${details}`);
    }
    return normalizePolicy(parsed);
}
function normalizePolicy(policy) {
    return {
        version: 1,
        default: "deny",
        rules: policy.rules.map((rule) => ({
            id: rule.id,
            allow: Boolean(rule.allow),
            when: {
                agent_names: rule.when.agent_names ? [...rule.when.agent_names] : undefined,
                roles: rule.when.roles ? [...rule.when.roles] : undefined,
                skills: rule.when.skills ? [...rule.when.skills] : undefined,
                envs: rule.when.envs ? [...rule.when.envs] : undefined,
                repo_paths_glob: rule.when.repo_paths_glob ? [...rule.when.repo_paths_glob] : undefined,
                dataset_ids: rule.when.dataset_ids ? [...rule.when.dataset_ids] : undefined,
                connector_ids: rule.when.connector_ids ? [...rule.when.connector_ids] : undefined,
            },
        })),
    };
}
