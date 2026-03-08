"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ControlRegistry = exports.ControlRegistrySchema = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const yaml_1 = require("yaml");
const zod_1 = require("zod");
const ControlOwnerSchema = zod_1.z.object({
    primary: zod_1.z.string().email(),
    backup: zod_1.z.string().email().optional(),
    team: zod_1.z.string().optional(),
});
const EvidenceConfigSchema = zod_1.z.object({
    path: zod_1.z.string(),
    retentionDays: zod_1.z.number().positive(),
    ttlDays: zod_1.z.number().positive(),
    signer: zod_1.z.string(),
    watermark: zod_1.z.boolean().optional(),
});
const ControlCheckSchema = zod_1.z.object({
    type: zod_1.z.enum(['automated', 'manual-with-expiry', 'hybrid']),
    script: zod_1.z.string().optional(),
    query: zod_1.z.string().optional(),
    manualEvidence: zod_1.z.string().optional(),
    endpoint: zod_1.z.string().url().optional(),
});
const ControlScheduleSchema = zod_1.z.object({
    frequencyMinutes: zod_1.z.number().positive(),
    toleranceMinutes: zod_1.z.number().nonnegative(),
});
const ControlDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    title: zod_1.z.string().min(3),
    category: zod_1.z.enum(['security', 'availability', 'confidentiality', 'privacy']),
    objective: zod_1.z.string().min(5),
    owner: ControlOwnerSchema,
    check: ControlCheckSchema,
    schedule: ControlScheduleSchema,
    rtoMinutes: zod_1.z.number().positive(),
    evidence: EvidenceConfigSchema,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    dependencies: zod_1.z.array(zod_1.z.string()).optional(),
    narrative: zod_1.z.string().optional(),
});
exports.ControlRegistrySchema = zod_1.z.array(ControlDefinitionSchema);
class ControlRegistry {
    controls;
    loadedFrom;
    constructor(controls, loadedFrom) {
        this.controls = new Map(controls.map(control => [control.id, control]));
        this.loadedFrom = loadedFrom;
    }
    static async fromYaml(filePath) {
        const raw = await promises_1.default.readFile(filePath, 'utf-8');
        const parsed = (0, yaml_1.parse)(raw);
        const controls = exports.ControlRegistrySchema.parse(parsed);
        const normalized = controls.map(control => ({
            ...control,
            evidence: {
                ...control.evidence,
                path: path_1.default.resolve(path_1.default.dirname(filePath), control.evidence.path),
            },
        }));
        return new ControlRegistry(normalized, filePath);
    }
    static fromDefinitions(definitions) {
        const controls = exports.ControlRegistrySchema.parse(definitions);
        return new ControlRegistry(controls);
    }
    toJSON() {
        return Array.from(this.controls.values());
    }
    upsert(control) {
        ControlDefinitionSchema.parse(control);
        this.controls.set(control.id, control);
    }
    get(controlId) {
        return this.controls.get(controlId);
    }
    list() {
        return Array.from(this.controls.values());
    }
    get sourcePath() {
        return this.loadedFrom;
    }
}
exports.ControlRegistry = ControlRegistry;
