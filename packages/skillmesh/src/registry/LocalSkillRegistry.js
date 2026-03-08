"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalSkillRegistry = void 0;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs-extra"));
class LocalSkillRegistry {
    registryPath;
    skills = new Map();
    constructor(registryPath) {
        this.registryPath = registryPath || path.join(os.homedir(), '.skillmesh', 'registry.json');
    }
    async init() {
        await fs.ensureDir(path.dirname(this.registryPath));
        if (await fs.pathExists(this.registryPath)) {
            const data = await fs.readJson(this.registryPath);
            this.skills = new Map(Object.entries(data));
        }
    }
    async addSkill(skill) {
        this.skills.set(skill.id, skill);
        await this.save();
    }
    async getSkill(id) {
        return this.skills.get(id);
    }
    async listSkills() {
        return Array.from(this.skills.values());
    }
    async save() {
        await fs.writeJson(this.registryPath, Object.fromEntries(this.skills), { spaces: 2 });
    }
    // Helper to create a skill object from a directory
    static async createSkillFromPath(dir, source) {
        const manifestPath = path.join(dir, 'manifest.json');
        if (!await fs.pathExists(manifestPath)) {
            throw new Error(`No manifest.json found in ${dir}`);
        }
        const manifest = await fs.readJson(manifestPath);
        // Validate manifest basics
        if (!manifest.name || !manifest.version) {
            throw new Error(`Invalid manifest in ${dir}: missing name or version`);
        }
        return {
            id: manifest.name, // Simple ID for now
            manifest,
            source,
            location: dir
        };
    }
}
exports.LocalSkillRegistry = LocalSkillRegistry;
