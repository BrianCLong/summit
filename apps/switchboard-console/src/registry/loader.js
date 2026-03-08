"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRegistrySources = loadRegistrySources;
exports.mergeRegistrySources = mergeRegistrySources;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = require("yaml");
async function loadRegistrySources(inputPath) {
    const stats = await (0, promises_1.stat)(inputPath);
    let files = [];
    if (stats.isDirectory()) {
        const entries = await (0, promises_1.readdir)(inputPath);
        files = entries
            .filter(e => e.endsWith('.json') || e.endsWith('.yaml') || e.endsWith('.yml'))
            .sort()
            .map(e => node_path_1.default.join(inputPath, e));
    }
    else {
        files = [inputPath];
    }
    const sources = [];
    for (const file of files) {
        const content = await (0, promises_1.readFile)(file, 'utf-8');
        const data = file.endsWith('.json') ? JSON.parse(content) : (0, yaml_1.parse)(content);
        sources.push({ file, data });
    }
    return sources;
}
function mergeRegistrySources(sources) {
    const merged = {
        version: '0.0.0',
        tools: [],
        servers: [],
    };
    const conflicts = new Map();
    const itemOrigins = new Map();
    for (const source of sources) {
        const { file, data } = source;
        if (data.version && merged.version === '0.0.0') {
            merged.version = data.version;
        }
        if (Array.isArray(data.tools)) {
            for (const tool of data.tools) {
                const id = tool.tool_id;
                if (id) {
                    const key = `tool:${id}`;
                    if (!conflicts.has(key))
                        conflicts.set(key, []);
                    conflicts.get(key).push(file);
                    if (!itemOrigins.has(key)) {
                        itemOrigins.set(key, file);
                        merged.tools.push(tool);
                    }
                }
            }
        }
        if (Array.isArray(data.servers)) {
            for (const server of data.servers) {
                const id = server.server_id;
                if (id) {
                    const key = `server:${id}`;
                    if (!conflicts.has(key))
                        conflicts.set(key, []);
                    conflicts.get(key).push(file);
                    if (!itemOrigins.has(key)) {
                        itemOrigins.set(key, file);
                        merged.servers.push(server);
                    }
                }
            }
        }
    }
    return { registry: merged, conflicts, itemOrigins };
}
