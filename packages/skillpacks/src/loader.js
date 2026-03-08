"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillLoader = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const glob_1 = require("glob");
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const schemaPath = path_1.default.resolve(__dirname, '../schemas/skill.schema.json');
let schema;
async function getSchema() {
    if (!schema) {
        const content = await promises_1.default.readFile(schemaPath, 'utf-8');
        schema = JSON.parse(content);
    }
    return schema;
}
class SkillLoader {
    ajv;
    validate;
    constructor() {
        this.ajv = new ajv_1.default({ allErrors: true });
    }
    async init() {
        const schema = await getSchema();
        this.validate = this.ajv.compile(schema);
    }
    async loadSkill(filePath) {
        if (!this.validate) {
            await this.init();
        }
        const content = await promises_1.default.readFile(filePath, 'utf-8');
        const data = js_yaml_1.default.load(content);
        const valid = this.validate(data);
        if (!valid) {
            throw new Error(`Skill validation failed for ${filePath}:\n${JSON.stringify(this.validate.errors, null, 2)}`);
        }
        return data;
    }
    async loadSkillsFromDirectory(dir) {
        const pattern = path_1.default.join(dir, '**/skill.yaml');
        // glob returns paths with forward slashes usually, ensuring cross-platform compat
        const files = await (0, glob_1.glob)(pattern, { ignore: '**/node_modules/**' });
        const skills = [];
        for (const file of files) {
            try {
                const skill = await this.loadSkill(file);
                skills.push(skill);
            }
            catch (error) {
                console.error(`Failed to load skill from ${file}:`, error);
                // We might want to throw or continue depending on strictness.
                // For now, log and continue.
            }
        }
        return skills;
    }
}
exports.SkillLoader = SkillLoader;
