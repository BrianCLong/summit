"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.loadEvents = loadEvents;
const fs_extra_1 = __importDefault(require("fs-extra"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const zod_1 = require("zod");
const AgentConfigSchema = zod_1.z.object({
    path: zod_1.z.string(),
    enabled: zod_1.z.boolean(),
});
const RuntimeConfigSchema = zod_1.z.object({
    enable_observability: zod_1.z.boolean(),
    enable_event_triggers: zod_1.z.boolean(),
    logs_dir: zod_1.z.string(),
    state_dir: zod_1.z.string(),
});
const SummitConfigSchema = zod_1.z.object({
    version: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    agents: zod_1.z.record(AgentConfigSchema),
    flows: zod_1.z.array(zod_1.z.string()),
    governance: zod_1.z.record(zod_1.z.string()),
    analytics: zod_1.z.record(zod_1.z.string()),
    runtime: RuntimeConfigSchema,
});
const EventTriggerSchema = zod_1.z.object({
    agent: zod_1.z.string(),
    flow: zod_1.z.string(),
});
const EventDefinitionSchema = zod_1.z.object({
    cron: zod_1.z.string().optional(),
    triggers: zod_1.z.array(EventTriggerSchema),
});
const EventsConfigSchema = zod_1.z.object({
    events: zod_1.z.record(EventDefinitionSchema),
});
async function loadConfig(configPath) {
    if (!fs_extra_1.default.existsSync(configPath)) {
        throw new Error(`Config file not found: ${configPath}`);
    }
    const content = await fs_extra_1.default.readFile(configPath, 'utf-8');
    const parsed = js_yaml_1.default.load(content);
    return SummitConfigSchema.parse(parsed);
}
async function loadEvents(eventsPath) {
    if (!fs_extra_1.default.existsSync(eventsPath)) {
        // Return empty if not found, or throw? The file is expected in the architecture.
        // For robustness, if missing, return empty triggers or log warning.
        console.warn(`Events file not found at ${eventsPath}, assuming no events.`);
        return { events: {} };
    }
    const content = await fs_extra_1.default.readFile(eventsPath, 'utf-8');
    const parsed = js_yaml_1.default.load(content);
    return EventsConfigSchema.parse(parsed);
}
