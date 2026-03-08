"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ajv_1 = __importDefault(require("ajv"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const schemaPath = path_1.default.resolve(__dirname, '../schemas/skill-manifest.schema.json');
if (!fs_1.default.existsSync(schemaPath)) {
    console.error(`Schema file not found at ${schemaPath}`);
    process.exit(1);
}
const schema = JSON.parse(fs_1.default.readFileSync(schemaPath, 'utf-8'));
const ajv = new ajv_1.default();
const validate = ajv.compile(schema);
const skillDir = process.argv[2];
if (!skillDir) {
    console.error('Usage: tsx validate_skill.ts <skill-directory>');
    process.exit(1);
}
const absoluteSkillDir = path_1.default.resolve(process.cwd(), skillDir);
const manifestPath = path_1.default.join(absoluteSkillDir, 'skill.yaml');
if (!fs_1.default.existsSync(manifestPath)) {
    console.error(`Error: skill.yaml not found in ${absoluteSkillDir}`);
    process.exit(1);
}
try {
    const manifestContent = fs_1.default.readFileSync(manifestPath, 'utf-8');
    const manifest = js_yaml_1.default.load(manifestContent);
    const valid = validate(manifest);
    if (!valid) {
        console.error('Validation failed:');
        console.error(JSON.stringify(validate.errors, null, 2));
        process.exit(1);
    }
    // Check structure
    const requiredFiles = ['SKILL.md', 'src/index.ts', 'package.json'];
    const missingFiles = requiredFiles.filter(f => !fs_1.default.existsSync(path_1.default.join(absoluteSkillDir, f)));
    if (missingFiles.length > 0) {
        console.error('Missing required files:', missingFiles.join(', '));
        process.exit(1);
    }
    // Check directories
    const requiredDirs = ['tests'];
    const missingDirs = requiredDirs.filter(d => !fs_1.default.existsSync(path_1.default.join(absoluteSkillDir, d)));
    if (missingDirs.length > 0) {
        console.error('Missing required directories:', missingDirs.join(', '));
        process.exit(1);
    }
    console.log(`✅ Skill ${path_1.default.basename(skillDir)} is valid!`);
}
catch (e) {
    console.error('Error validating skill:', e);
    process.exit(1);
}
