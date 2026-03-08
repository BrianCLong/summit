"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const openclaw_js_1 = require("../src/skills/openclaw.js");
const SKILL_MD = `---\nname: bankr\ndescription: Executes raw transaction JSON on chain\nmetadata:\n  clawdbot:\n    emoji: \"🤖\"\n    homepage: \"https://example.com\"\n    requires:\n      bins:\n        - jq\n---\nUse when you need to submit raw transactions or calldata.\n`;
describe('openclaw skill ingestion', () => {
    test('parses frontmatter and computes risk', () => {
        const doc = (0, openclaw_js_1.parseSkillMd)(SKILL_MD);
        expect(doc.frontmatter.name).toBe('bankr');
        expect(doc.frontmatter.description).toBe('Executes raw transaction JSON on chain');
        expect(doc.frontmatter.metadata?.clawdbot?.requires?.bins).toEqual(['jq']);
        const risk = (0, openclaw_js_1.computeRisk)(doc);
        expect(risk.arbitraryTransactions).toBe(true);
    });
    test('ingests a local skill repo and writes deterministic artifacts', () => {
        const tmp = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'openclaw-test-'));
        const repoRoot = node_path_1.default.join(tmp, 'repo');
        const outputDir = node_path_1.default.join(tmp, 'artifacts');
        const skillRoot = node_path_1.default.join(repoRoot, 'bankr', 'bankr');
        node_fs_1.default.mkdirSync(node_path_1.default.join(skillRoot, 'scripts'), { recursive: true });
        node_fs_1.default.mkdirSync(node_path_1.default.join(skillRoot, 'references'), { recursive: true });
        node_fs_1.default.writeFileSync(node_path_1.default.join(skillRoot, 'SKILL.md'), SKILL_MD);
        node_fs_1.default.writeFileSync(node_path_1.default.join(skillRoot, 'scripts', 'bankr.sh'), '#!/usr/bin/env bash\n');
        node_fs_1.default.writeFileSync(node_path_1.default.join(skillRoot, 'references', 'README.md'), 'Docs');
        const index = (0, openclaw_js_1.ingestOpenClawRepo)({
            repo: repoRoot,
            outputDir,
            provider: 'bankr',
            skill: 'bankr',
        });
        expect(index.skills).toHaveLength(1);
        const entry = index.skills[0];
        expect(entry.slug).toBe('bankr/bankr');
        expect(entry.evidenceId).toMatch(/^EVID:OPENCLAW:bankr:bankr:[a-f0-9]{8}$/);
        expect(entry.assets.scripts).toEqual(['scripts/bankr.sh']);
        expect(entry.assets.references).toEqual(['references/README.md']);
        const indexPath = node_path_1.default.join(outputDir, 'skill-index.json');
        const evidencePath = node_path_1.default.join(outputDir, 'evidence.json');
        expect(node_fs_1.default.existsSync(indexPath)).toBe(true);
        expect(node_fs_1.default.existsSync(evidencePath)).toBe(true);
    });
});
