"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const loader_js_1 = require("../loader.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
describe('SkillLoader', () => {
    const loader = new loader_js_1.SkillLoader();
    const fixtureDir = path_1.default.resolve(__dirname, 'fixtures');
    it('should load a valid skill', async () => {
        const skillPath = path_1.default.join(fixtureDir, 'valid-skill/skill.yaml');
        const skill = await loader.loadSkill(skillPath);
        expect(skill).toBeDefined();
        expect(skill.metadata.name).toBe('test-skill');
        expect(skill.schema_version).toBe('v2');
        expect(skill.steps).toHaveLength(1);
        expect(skill.steps[0].type).toBe('exec');
    });
    it('should load skills from directory', async () => {
        const skills = await loader.loadSkillsFromDirectory(fixtureDir);
        expect(skills.length).toBeGreaterThanOrEqual(1);
        const testSkill = skills.find(s => s.metadata.name === 'test-skill');
        expect(testSkill).toBeDefined();
    });
});
