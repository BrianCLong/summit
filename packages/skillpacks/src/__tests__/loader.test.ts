import path from 'path';
import { fileURLToPath } from 'url';
import { SkillLoader } from '../loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SkillLoader', () => {
  const loader = new SkillLoader();
  const fixtureDir = path.resolve(__dirname, 'fixtures');

  it('should load a valid skill', async () => {
    const skillPath = path.join(fixtureDir, 'valid-skill/skill.yaml');
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
