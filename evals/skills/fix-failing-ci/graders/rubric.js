"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grade = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const hasSections = (content, sections) => sections.every((section) => content.includes(section));
const grade = async ({ skillDir, }) => {
    const checks = [];
    let passed = 0;
    const skillDoc = await promises_1.default.readFile(node_path_1.default.join(skillDir, 'skill.md'), 'utf8');
    const docPass = hasSections(skillDoc, [
        '## Definition',
        '## Success Criteria',
        '## Constraints',
        '## Definition of Done',
    ]);
    checks.push({
        id: 'documentation-completeness',
        pass: docPass,
        notes: docPass ? undefined : 'skill.md missing required sections',
    });
    if (docPass) {
        passed += 1;
    }
    const promptsRaw = await promises_1.default.readFile(node_path_1.default.join(skillDir, 'prompts.csv'), 'utf8');
    const promptCount = promptsRaw
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0).length;
    const promptPass = promptCount >= 11 && promptCount <= 21;
    checks.push({
        id: 'prompt-coverage',
        pass: promptPass,
        notes: promptPass
            ? undefined
            : `Expected 10-20 prompts, found ${promptCount - 1}`,
    });
    if (promptPass) {
        passed += 1;
    }
    const configRaw = await promises_1.default.readFile(node_path_1.default.join(skillDir, 'configs', 'run.yaml'), 'utf8');
    const config = js_yaml_1.default.load(configRaw);
    const configPass = Array.isArray(config.allowed_tools) &&
        config.allowed_tools.length > 0 &&
        Array.isArray(config.forbidden_paths) &&
        config.forbidden_paths.length > 0;
    checks.push({
        id: 'config-alignment',
        pass: configPass,
        notes: configPass ? undefined : 'run.yaml missing tool/path constraints',
    });
    if (configPass) {
        passed += 1;
    }
    const score = Math.round((passed / checks.length) * 100);
    return {
        overall_pass: checks.every((check) => check.pass),
        score,
        checks,
    };
};
exports.grade = grade;
