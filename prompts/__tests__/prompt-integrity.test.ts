import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Prompt Integrity Suite', () => {
  const promptsDir = path.join(__dirname, '..');

  // Core agent prompt files that must exist
  const corePromptFiles = [
    'claude-code.md',
    'codex.md',
    'jules-gemini.md',
    'cursor-warp.md',
    'summit-platform.md',
    'ci-cd-enforcement.md',
    'meta-router.md',
    'capability-matrix.md',
    'enterprise-4th-order.md',
  ];

  // Existing persona prompts
  const personaPromptFiles = [
    'architect.md',
    'hermes.md',
    'orion.md',
    'aegis.md',
    'elara.md',
  ];

  // All required prompt files
  const allPromptFiles = [...corePromptFiles, ...personaPromptFiles];

  describe('File Existence', () => {
    test.each(corePromptFiles)(
      'core prompt file %s exists and is non-empty',
      (file) => {
        const filePath = path.join(promptsDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
        const stats = fs.statSync(filePath);
        expect(stats.size).toBeGreaterThan(50);
      },
    );

    test.each(personaPromptFiles)(
      'persona prompt file %s exists',
      (file) => {
        const filePath = path.join(promptsDir, file);
        expect(fs.existsSync(filePath)).toBe(true);
      },
    );

    test('README.md exists', () => {
      const readmePath = path.join(promptsDir, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
    });
  });

  describe('Prompt Content', () => {
    test.each(corePromptFiles)(
      '%s contains BEGIN or EXECUTE marker',
      (file) => {
        const content = fs.readFileSync(path.join(promptsDir, file), 'utf8');
        expect(content).toMatch(/BEGIN|EXECUTE/i);
      },
    );

    test.each(allPromptFiles)(
      '%s has a proper markdown heading',
      (file) => {
        const content = fs.readFileSync(path.join(promptsDir, file), 'utf8');
        expect(content).toMatch(/^#\s+.+/m);
      },
    );

    test.each(corePromptFiles)(
      '%s contains output format section',
      (file) => {
        const content = fs.readFileSync(path.join(promptsDir, file), 'utf8');
        // Most prompts should have output format or required output section
        expect(content).toMatch(/output|format|required/i);
      },
    );
  });

  describe('Prompt Structure', () => {
    test('meta-router.md references all agent types', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'meta-router.md'),
        'utf8',
      );
      expect(content).toMatch(/CLAUDE CODE/i);
      expect(content).toMatch(/CODEX/i);
      expect(content).toMatch(/JULES|GEMINI/i);
      expect(content).toMatch(/CURSOR|WARP/i);
      expect(content).toMatch(/SUMMIT/i);
      expect(content).toMatch(/CI.?CD/i);
    });

    test('capability-matrix.md contains a table', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'capability-matrix.md'),
        'utf8',
      );
      // Markdown tables have | characters
      expect(content).toMatch(/\|.*\|.*\|/);
    });

    test('enterprise-4th-order.md covers all governance areas', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'enterprise-4th-order.md'),
        'utf8',
      );
      expect(content).toMatch(/governance/i);
      expect(content).toMatch(/operations/i);
      expect(content).toMatch(/security/i);
      expect(content).toMatch(/architecture/i);
    });
  });

  describe('Prompt Packs', () => {
    const packsDir = path.join(promptsDir, 'packs');

    test('packs directory exists', () => {
      expect(fs.existsSync(packsDir)).toBe(true);
      expect(fs.statSync(packsDir).isDirectory()).toBe(true);
    });

    test('base.system.txt exists', () => {
      const filePath = path.join(packsDir, 'base.system.txt');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    test('code.system.txt exists', () => {
      const filePath = path.join(packsDir, 'code.system.txt');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Schema Compliance', () => {
    test('schema.json exists', () => {
      const schemaPath = path.join(promptsDir, 'schema.json');
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    test('schema.json is valid JSON', () => {
      const schemaPath = path.join(promptsDir, 'schema.json');
      const content = fs.readFileSync(schemaPath, 'utf8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('No Sensitive Content', () => {
    test.each(allPromptFiles)(
      '%s does not contain API keys or secrets',
      (file) => {
        const content = fs.readFileSync(path.join(promptsDir, file), 'utf8');
        // Check for common secret patterns
        expect(content).not.toMatch(/api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i);
        expect(content).not.toMatch(/secret\s*[:=]\s*['"][^'"]+['"]/i);
        expect(content).not.toMatch(/password\s*[:=]\s*['"][^'"]+['"]/i);
        expect(content).not.toMatch(/sk-[a-zA-Z0-9]{32,}/); // OpenAI key pattern
      },
    );
  });
});
