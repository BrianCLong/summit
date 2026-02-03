import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  computeRisk,
  ingestOpenClawRepo,
  parseSkillMd,
} from '../src/skills/openclaw.js';

const SKILL_MD = `---\nname: bankr\ndescription: Executes raw transaction JSON on chain\nmetadata:\n  clawdbot:\n    emoji: \"🤖\"\n    homepage: \"https://example.com\"\n    requires:\n      bins:\n        - jq\n---\nUse when you need to submit raw transactions or calldata.\n`;

describe('openclaw skill ingestion', () => {
  test('parses frontmatter and computes risk', () => {
    const doc = parseSkillMd(SKILL_MD);
    expect(doc.frontmatter.name).toBe('bankr');
    expect(doc.frontmatter.description).toBe('Executes raw transaction JSON on chain');
    expect(doc.frontmatter.metadata?.clawdbot?.requires?.bins).toEqual(['jq']);
    const risk = computeRisk(doc);
    expect(risk.arbitraryTransactions).toBe(true);
  });

  test('ingests a local skill repo and writes deterministic artifacts', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openclaw-test-'));
    const repoRoot = path.join(tmp, 'repo');
    const outputDir = path.join(tmp, 'artifacts');
    const skillRoot = path.join(repoRoot, 'bankr', 'bankr');
    fs.mkdirSync(path.join(skillRoot, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(skillRoot, 'references'), { recursive: true });
    fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), SKILL_MD);
    fs.writeFileSync(path.join(skillRoot, 'scripts', 'bankr.sh'), '#!/usr/bin/env bash\n');
    fs.writeFileSync(path.join(skillRoot, 'references', 'README.md'), 'Docs');

    const index = ingestOpenClawRepo({
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

    const indexPath = path.join(outputDir, 'skill-index.json');
    const evidencePath = path.join(outputDir, 'evidence.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    expect(fs.existsSync(evidencePath)).toBe(true);
  });
});
