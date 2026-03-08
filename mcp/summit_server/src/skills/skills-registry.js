"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsRegistry = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const skillsRoot = path_1.default.resolve('skills/mcp');
const parseToc = (content) => content
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.replace(/^##\s+/, '').trim());
class SkillsRegistry {
    skills;
    constructor(skills) {
        this.skills = skills;
    }
    static async load() {
        const skills = [
            {
                id: 'mcp-auth',
                name: 'MCP Auth & Scopes',
                summary: 'Scopes, tenant routing, and least-privilege guardrails.',
                toc: [],
                filePath: path_1.default.join(skillsRoot, 'auth', 'SKILL.md'),
            },
            {
                id: 'mcp-policy',
                name: 'Policy Gate',
                summary: 'Policy-as-code checks and break-glass controls.',
                toc: [],
                filePath: path_1.default.join(skillsRoot, 'policy', 'SKILL.md'),
            },
            {
                id: 'mcp-evidence',
                name: 'Evidence & Provenance',
                summary: 'Evidence bundle generation and audit trail steps.',
                toc: [],
                filePath: path_1.default.join(skillsRoot, 'evidence', 'SKILL.md'),
            },
            {
                id: 'mcp-transport',
                name: 'Transports',
                summary: 'STDIO + SSE transport practices and constraints.',
                toc: [],
                filePath: path_1.default.join(skillsRoot, 'transport', 'SKILL.md'),
            },
        ];
        const resolvedSkills = await Promise.all(skills.map(async (skill) => {
            const content = await (0, promises_1.readFile)(skill.filePath, 'utf-8');
            return { ...skill, toc: parseToc(content) };
        }));
        return new SkillsRegistry(resolvedSkills);
    }
    list() {
        return [...this.skills].sort((a, b) => a.id.localeCompare(b.id));
    }
    async getSkill(skillId) {
        const skill = this.skills.find((entry) => entry.id === skillId);
        if (!skill) {
            throw new Error(`Unknown skill: ${skillId}`);
        }
        return skill;
    }
    async getSkillSection(skillId, section) {
        const skill = await this.getSkill(skillId);
        const content = await (0, promises_1.readFile)(skill.filePath, 'utf-8');
        const sections = content.split(/\n## /g);
        const matched = sections.find((entry) => entry.toLowerCase().startsWith(section.toLowerCase()));
        if (!matched) {
            throw new Error(`Section not found: ${section}`);
        }
        const normalized = matched.startsWith('#') ? matched : `## ${matched}`;
        return normalized.trim();
    }
}
exports.SkillsRegistry = SkillsRegistry;
