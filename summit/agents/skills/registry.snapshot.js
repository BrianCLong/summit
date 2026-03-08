"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSkillRegistrySnapshot = buildSkillRegistrySnapshot;
exports.snapshotSha256 = snapshotSha256;
exports.writeSkillRegistrySnapshot = writeSkillRegistrySnapshot;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const hash_1 = require("../../../packages/dpec/src/hash");
function buildSkillRegistrySnapshot(registry) {
    if (registry && typeof registry === 'object') {
        const candidate = registry;
        if (candidate.snapshot_version === 1 && Array.isArray(candidate.skills)) {
            return {
                snapshot_version: 1,
                skills: candidate.skills
                    .map((skill) => ({
                    id: String(skill.id ?? ''),
                    version: typeof skill.version === 'string' ? skill.version : undefined,
                    path: typeof skill.path === 'string' ? skill.path : undefined,
                    schema: skill.schema && typeof skill.schema === 'object'
                        ? skill.schema
                        : undefined,
                }))
                    .filter((skill) => skill.id.length > 0)
                    .sort((a, b) => a.id.localeCompare(b.id)),
            };
        }
    }
    const entries = Array.isArray(registry)
        ? registry
        : Object.entries((registry ?? {})).map(([id, value]) => ({
            id,
            ...(typeof value === 'object' && value ? value : {}),
        }));
    const skills = entries
        .map((entry) => {
        const skill = entry;
        return {
            id: String(skill.id ?? ''),
            version: typeof skill.version === 'string' ? skill.version : undefined,
            path: typeof skill.path === 'string' ? skill.path : undefined,
            schema: skill.schema && typeof skill.schema === 'object'
                ? skill.schema
                : undefined,
        };
    })
        .filter((skill) => skill.id.length > 0)
        .sort((a, b) => a.id.localeCompare(b.id));
    return {
        snapshot_version: 1,
        skills,
    };
}
function snapshotSha256(snapshot) {
    return (0, hash_1.sha256)((0, hash_1.stableStringify)(snapshot));
}
function writeSkillRegistrySnapshot(registry, outFile = node_path_1.default.resolve(process.cwd(), 'summit/agents/skills/registry.snapshot.json')) {
    const snapshot = buildSkillRegistrySnapshot(registry);
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(outFile), { recursive: true });
    node_fs_1.default.writeFileSync(outFile, `${(0, hash_1.stableStringify)(snapshot)}\n`, 'utf8');
    return snapshot;
}
