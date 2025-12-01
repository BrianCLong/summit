import fs from 'fs';
import path from 'path';

/**
 * Prompt Integrity Test Suite
 * 
 * Validates that all required agent prompts exist and contain
 * necessary execution markers.
 */
describe('Prompt Integrity Suite', () => {
  const promptsDir = path.join(__dirname, '..');

  const requiredFiles = [
    'README.md',
    'claude-code.md',
    'codex.md',
    'jules-gemini.md',
    'cursor-warp.md',
    'summit-intelgraph.md',
    'ci-cd.md',
    'meta-router.md',
    'capability-matrix.md',
    'enterprise-4th-order.md',
    'workflow-automation.md',
  ];

  describe('File Existence', () => {
    test.each(requiredFiles)('%s exists and is not empty', (file) => {
      const fullPath = path.join(promptsDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(100);
    });
  });

  describe('Execution Markers', () => {
    const executablePrompts = [
      'claude-code.md',
      'codex.md',
      'jules-gemini.md',
      'cursor-warp.md',
      'summit-intelgraph.md',
      'ci-cd.md',
      'meta-router.md',
    ];

    test.each(executablePrompts)(
      '%s contains execution marker (BEGIN/EXECUTE)',
      (file) => {
        const content = fs.readFileSync(
          path.join(promptsDir, file),
          'utf8'
        );
        expect(content).toMatch(/BEGIN|EXECUTE/i);
      }
    );
  });

  describe('Required Sections', () => {
    test('claude-code.md has all execution layers', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'claude-code.md'),
        'utf8'
      );
      expect(content).toMatch(/1st-Order/i);
      expect(content).toMatch(/2nd-Order/i);
      expect(content).toMatch(/3rd-Order/i);
      expect(content).toMatch(/SELF-AUDIT/i);
    });

    test('ci-cd.md has mandatory questions', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'ci-cd.md'),
        'utf8'
      );
      expect(content).toMatch(/MANDATORY QUESTIONS/i);
      expect(content).toMatch(/Will typecheck pass/i);
      expect(content).toMatch(/Will CI be green/i);
    });

    test('enterprise-4th-order.md has all governance domains', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'enterprise-4th-order.md'),
        'utf8'
      );
      expect(content).toMatch(/GOVERNANCE/i);
      expect(content).toMatch(/OPERATIONS/i);
      expect(content).toMatch(/SECURITY/i);
      expect(content).toMatch(/ARCHITECTURE/i);
      expect(content).toMatch(/ORGANIZATIONAL EFFECTIVENESS/i);
    });

    test('meta-router.md has decision tree', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'meta-router.md'),
        'utf8'
      );
      expect(content).toMatch(/DECISION TREE/i);
      expect(content).toMatch(/AGENT SELECTION LOGIC/i);
    });
  });

  describe('Content Quality', () => {
    test('No TODO markers in prompts', () => {
      for (const file of requiredFiles) {
        const content = fs.readFileSync(
          path.join(promptsDir, file),
          'utf8'
        );
        expect(content).not.toMatch(/TODO/i);
      }
    });

    test('No placeholder text in prompts', () => {
      const placeholders = [
        '[INSERT',
        '[TBD',
        '[PLACEHOLDER',
        'Lorem ipsum',
      ];
      
      for (const file of requiredFiles) {
        const content = fs.readFileSync(
          path.join(promptsDir, file),
          'utf8'
        );
        for (const placeholder of placeholders) {
          expect(content).not.toMatch(new RegExp(placeholder, 'i'));
        }
      }
    });
  });

  describe('Capability Matrix Validation', () => {
    test('capability-matrix.md has all agents listed', () => {
      const content = fs.readFileSync(
        path.join(promptsDir, 'capability-matrix.md'),
        'utf8'
      );
      const requiredAgents = [
        'Claude Code',
        'Codex',
        'Jules/Gemini',
        'Cursor/Warp',
        'Summit Superprompt',
        'CI/CD Prompt',
      ];
      
      for (const agent of requiredAgents) {
        expect(content).toMatch(new RegExp(agent, 'i'));
      }
    });
  });
});

/**
 * Prompt Version Tracking
 * 
 * Ensures prompt versions are tracked for auditing.
 */
describe('Prompt Version Tracking', () => {
  test('Prompts have been updated recently', () => {
    const promptFiles = [
      'claude-code.md',
      'codex.md',
      'jules-gemini.md',
    ];

    for (const file of promptFiles) {
      const fullPath = path.join(__dirname, '..', file);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const age = Date.now() - stats.mtimeMs;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        
        // Warn if prompts haven't been reviewed in 30 days
        if (age > thirtyDays) {
          console.warn(
            `Warning: ${file} hasn't been updated in ${Math.floor(
              age / (24 * 60 * 60 * 1000)
            )} days`
          );
        }
      }
    }
  });
});
