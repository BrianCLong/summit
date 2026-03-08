"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsetStore = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const yaml_1 = require("yaml");
class SkillsetStore {
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    async list() {
        const entries = await (0, promises_1.readdir)(this.baseDir);
        const skillsets = [];
        for (const entry of entries) {
            if (!entry.endsWith('.yaml')) {
                continue;
            }
            const skillsetFile = await this.load(node_path_1.default.join(this.baseDir, entry));
            skillsets.push(skillsetFile.skillset);
        }
        return skillsets;
    }
    async get(name) {
        const skillsetFile = await this.getWithPath(name);
        return skillsetFile.skillset;
    }
    async getWithPath(name) {
        const filePath = node_path_1.default.join(this.baseDir, `${name}.yaml`);
        return this.load(filePath);
    }
    async load(filePath) {
        const raw = await (0, promises_1.readFile)(filePath, 'utf-8');
        const data = (0, yaml_1.parse)(raw);
        if (!data.name || !data.description || !data.system_prompt) {
            throw new Error(`Invalid skillset file: ${filePath}`);
        }
        return {
            path: filePath,
            skillset: {
                name: data.name,
                description: data.description,
                systemPrompt: data.system_prompt,
            },
        };
    }
}
exports.SkillsetStore = SkillsetStore;
