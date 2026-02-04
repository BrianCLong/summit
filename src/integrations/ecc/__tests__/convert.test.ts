import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { loadEccPack, convertToSummitPack } from '../convert';

describe('ECC Converter', () => {
  it('should load an ECC pack from a fixture directory', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'ecc-mini');
    const pack = loadEccPack(fixturePath);

    expect(pack.agents.persona).toBe('Persona content\n');
    expect(pack.skills.ability).toBe('Skill content\n');
    expect(pack.hooksJson).toEqual({ hook: 'test' });
  });

  it('should convert an ECC pack to a Summit pack', () => {
    const ecc = {
      agents: { 'test-agent': 'persona' },
      skills: { 'test-skill': 'ability' },
      commands: {},
      rules: {},
    };
    const summit = convertToSummitPack(ecc);
    expect(summit.meta.source).toBe('ECC');
    expect(summit.agents).toEqual(ecc.agents);
    expect(summit.skills).toEqual(ecc.skills);
  });
});
