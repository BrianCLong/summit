import fs from 'fs';
import path from 'path';

/**
 * Ultra-Prime Recursive Meta-Extrapolative Prompt Validation
 *
 * This test suite validates the Ultra-Prime prompt's structure,
 * completeness, and adherence to its own standards.
 *
 * Meta-note: This test dogfoods the ultra-prime principles by
 * being comprehensive, well-structured, and complete.
 */
describe('Ultra-Prime Prompt Validation', () => {
  const promptPath = path.join(
    __dirname,
    '..',
    'ultra-prime-recursive-meta-extrapolative.md'
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(promptPath, 'utf8');
  });

  describe('File Existence and Basic Structure', () => {
    test('file exists', () => {
      expect(fs.existsSync(promptPath)).toBe(true);
    });

    test('exceeds minimum length (10KB)', () => {
      expect(content.length).toBeGreaterThan(10000);
    });

    test('is well-formed markdown', () => {
      // Should have headers
      expect(content).toMatch(/^#/m);
      // Should have proper nesting
      expect(content).toMatch(/^##/m);
      expect(content).toMatch(/^###/m);
    });
  });

  describe('Prime Directive Components', () => {
    test('has PRIME DIRECTIVE section', () => {
      expect(content).toMatch(/##.*PRIME DIRECTIVE/i);
    });

    test('defines recursive meta-extrapolation as core concept', () => {
      expect(content).toMatch(/recursive meta-extrapolation/i);
    });

    test('specifies autonomous, hyper-capable agent', () => {
      expect(content).toMatch(/autonomous.*hyper-capable.*development agent/i);
    });

    test('defines mission to exceed intent', () => {
      expect(content).toMatch(/true intent/i);
      expect(content).toMatch(/not.*what is written.*what is meant/i);
    });

    test('mentions Platonic ideal', () => {
      expect(content).toMatch(/Platonic ideal/i);
    });
  });

  describe('Recursive Meta-Extrapolation Engine (Section I)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*I\..*META-EXTRAPOLATION ENGINE/i);
    });

    test('requires minimum 20 levels of extrapolation', () => {
      expect(content).toMatch(/20 levels/i);
    });

    describe('Forward Extrapolation Layers', () => {
      test('defines technical implications (levels 1-8)', () => {
        expect(content).toMatch(/Technical Implications/i);
        expect(content).toMatch(/Levels 1-8/i);
      });

      test('covers architectural patterns', () => {
        expect(content).toMatch(/Architectural Patterns/i);
      });

      test('covers integration points', () => {
        expect(content).toMatch(/Integration Points/i);
      });

      test('covers data flow', () => {
        expect(content).toMatch(/Data Flow/i);
      });

      test('covers error conditions', () => {
        expect(content).toMatch(/Error Conditions/i);
      });

      test('defines operational implications (levels 9-14)', () => {
        expect(content).toMatch(/Operational Implications/i);
        expect(content).toMatch(/Levels 9-14/i);
      });

      test('covers DevOps requirements', () => {
        expect(content).toMatch(/DevOps Requirements/i);
      });

      test('covers security requirements', () => {
        expect(content).toMatch(/Security Requirements/i);
      });

      test('covers compliance obligations', () => {
        expect(content).toMatch(/Compliance Obligations/i);
      });

      test('defines strategic implications (levels 15-20)', () => {
        expect(content).toMatch(/Strategic Implications/i);
        expect(content).toMatch(/Levels 15-20/i);
      });

      test('covers emergent behaviors', () => {
        expect(content).toMatch(/Emergent Behaviors/i);
      });

      test('covers UX and human factors', () => {
        expect(content).toMatch(/UX.*human.*factors/i);
      });

      test('defines meta-level implications (20+)', () => {
        expect(content).toMatch(/Meta-level Implications/i);
        expect(content).toMatch(/Level 20\+/i);
      });

      test('covers second-order effects', () => {
        expect(content).toMatch(/Second-order Effects/i);
      });
    });

    describe('Meta-Extrapolation (Prompt Self-Improvement)', () => {
      test('has meta-extrapolation subsection', () => {
        expect(content).toMatch(/###.*B\..*Meta-Extrapolation/i);
      });

      test('requires prompt improvement before execution', () => {
        expect(content).toMatch(/improve the request itself/i);
      });

      test('requires reconstruction of ideal request', () => {
        expect(content).toMatch(/Reconstruct.*stronger.*ideal version/i);
      });

      test('requires identification of missing layers', () => {
        expect(content).toMatch(/Identify.*missing layers/i);
      });
    });

    describe('Solution Space Exploration', () => {
      test('has solution space exploration subsection', () => {
        expect(content).toMatch(/###.*C\..*Solution Space Exploration/i);
      });

      test('requires multiple candidate architectures', () => {
        expect(content).toMatch(/3-5 candidate architectures/i);
      });

      test('requires evaluation against criteria', () => {
        expect(content).toMatch(/Evaluate.*against/i);
      });
    });
  });

  describe('Complete, Perfected Implementation Engine (Section II)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*II\..*IMPLEMENTATION ENGINE/i);
    });

    describe('Core Implementation Requirements', () => {
      test('requires complete codebase', () => {
        expect(content).toMatch(/Complete Codebase/i);
      });

      test('forbids TODOs and placeholders', () => {
        expect(content).toMatch(/no TODOs.*no placeholders/i);
      });

      test('requires API specifications', () => {
        expect(content).toMatch(/API Specifications/i);
      });

      test('requires data layer definitions', () => {
        expect(content).toMatch(/Data Layer/i);
      });

      test('requires configuration and infrastructure', () => {
        expect(content).toMatch(/Configuration.*Infrastructure/i);
      });
    });

    describe('Comprehensive Test Corpus', () => {
      test('requires comprehensive test corpus', () => {
        expect(content).toMatch(/Comprehensive Test Corpus/i);
      });

      test('requires unit tests', () => {
        expect(content).toMatch(/Unit Tests/i);
      });

      test('requires integration tests', () => {
        expect(content).toMatch(/Integration Tests/i);
      });

      test('requires system tests', () => {
        expect(content).toMatch(/System Tests/i);
      });

      test('requires property-based tests', () => {
        expect(content).toMatch(/Property-based Tests/i);
      });

      test('requires performance tests', () => {
        expect(content).toMatch(/Performance Tests/i);
      });
    });

    describe('Full Documentation Suite', () => {
      test('requires full documentation suite', () => {
        expect(content).toMatch(/Full Documentation Suite/i);
      });

      test('requires README', () => {
        expect(content).toMatch(/README\.md/i);
      });

      test('requires ARCHITECTURE.md', () => {
        expect(content).toMatch(/ARCHITECTURE\.md/i);
      });

      test('requires API documentation', () => {
        expect(content).toMatch(/API Documentation/i);
      });

      test('requires ADRs', () => {
        expect(content).toMatch(/Architecture Decision Records.*ADR/i);
      });

      test('requires developer guide', () => {
        expect(content).toMatch(/Developer Guide/i);
      });

      test('requires operations guide', () => {
        expect(content).toMatch(/Operations Guide/i);
      });

      test('requires runbooks', () => {
        expect(content).toMatch(/Runbooks/i);
      });
    });

    describe('DevOps & Platform Deliverables', () => {
      test('requires DevOps deliverables', () => {
        expect(content).toMatch(/DevOps.*Platform Deliverables/i);
      });

      test('requires CI/CD pipelines', () => {
        expect(content).toMatch(/CI\/CD Pipelines/i);
      });

      test('requires Infrastructure as Code', () => {
        expect(content).toMatch(/Infrastructure as Code/i);
      });

      test('requires observability', () => {
        expect(content).toMatch(/Observability/i);
      });

      test('requires operational tooling', () => {
        expect(content).toMatch(/Operational Tooling/i);
      });

      test('requires disaster recovery', () => {
        expect(content).toMatch(/Disaster Recovery/i);
      });
    });
  });

  describe('Perfect Pull Request Generator (Section III)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*III\..*PULL REQUEST GENERATOR/i);
    });

    test('requires atomic commits', () => {
      expect(content).toMatch(/atomic.*commits/i);
    });

    test('requires clean history', () => {
      expect(content).toMatch(/clean history/i);
    });

    test('requires conventional commits', () => {
      expect(content).toMatch(/conventional commit/i);
    });

    test('defines PR package structure', () => {
      expect(content).toMatch(/PR.*Package/i);
    });

    test('requires PR title', () => {
      expect(content).toMatch(/PR Title/i);
    });

    test('requires PR description template', () => {
      expect(content).toMatch(/## Summary/);
      expect(content).toMatch(/## Motivation/);
      expect(content).toMatch(/## Implementation/);
    });

    test('requires merge readiness confirmation', () => {
      expect(content).toMatch(/Merge Readiness/i);
    });

    test('requires post-merge instructions', () => {
      expect(content).toMatch(/Post-merge Instructions/i);
    });
  });

  describe('Edge-of-Innovation Directive (Section IV)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*IV\..*EDGE-OF-INNOVATION/i);
    });

    test('defines technical excellence', () => {
      expect(content).toMatch(/Technical Excellence/i);
    });

    test('defines architectural beauty', () => {
      expect(content).toMatch(/Architectural Beauty/i);
    });

    test('emphasizes innovation focus', () => {
      expect(content).toMatch(/Innovation Focus/i);
    });

    test('defines quality standards', () => {
      expect(content).toMatch(/Quality Standards/i);
    });

    test('requires excellence beyond correctness', () => {
      expect(content).toMatch(/not.*merely.*correct.*impressively excellent/i);
    });
  });

  describe('Zero-Placeholder Policy (Section V)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*V\..*ZERO-PLACEHOLDER POLICY/i);
    });

    test('explicitly forbids TODOs', () => {
      expect(content).toMatch(/NO TODOs/i);
    });

    test('explicitly forbids PLACEHOLDERS', () => {
      expect(content).toMatch(/NO PLACEHOLDERS/i);
    });

    test('explicitly forbids NOTHING MISSING', () => {
      expect(content).toMatch(/NOTHING MISSING/i);
    });

    test('lists forbidden patterns', () => {
      expect(content).toMatch(/\/\/ TODO: implement this/);
      expect(content).toMatch(/\/\/ FIXME/);
      expect(content).toMatch(/\/\/ Placeholder/);
    });
  });

  describe('User Request Interpretation Logic (Section VI)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*VI\..*REQUEST INTERPRETATION LOGIC/i);
    });

    test('defines Step 1: Meta-Extrapolation', () => {
      expect(content).toMatch(/Step 1.*Meta-Extrapolation/i);
    });

    test('defines Step 2: Solution Generation', () => {
      expect(content).toMatch(/Step 2.*Solution Generation/i);
    });

    test('defines Step 3: Deliverable Packaging', () => {
      expect(content).toMatch(/Step 3.*Deliverable Packaging/i);
    });
  });

  describe('Integration with Summit/IntelGraph Ecosystem (Section VII)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*VII\..*INTEGRATION.*SUMMIT.*INTELGRAPH/i);
    });

    test('aligns with 4th-Order Governance', () => {
      expect(content).toMatch(/4th-Order.*Governance/i);
    });

    test('integrates with meta-router', () => {
      expect(content).toMatch(/Integration with Meta-Router/i);
    });

    test('has capability matrix entry', () => {
      expect(content).toMatch(/Capability Matrix Entry/i);
    });
  });

  describe('Self-Improvement Protocol (Section VIII)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*VIII\..*SELF-IMPROVEMENT PROTOCOL/i);
    });

    test('defines continuous prompt evolution', () => {
      expect(content).toMatch(/Continuous Prompt Evolution/i);
    });

    test('defines feedback loop integration', () => {
      expect(content).toMatch(/Feedback Loop Integration/i);
    });

    test('has version history table', () => {
      expect(content).toMatch(/Version History/i);
      expect(content).toMatch(/\|.*Version.*\|.*Date.*\|.*Changes/i);
    });
  });

  describe('Output Format Template (Section IX)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*IX\..*OUTPUT FORMAT/i);
    });

    test('defines meta-extrapolation output', () => {
      expect(content).toMatch(/##.*Meta-Extrapolation/);
    });

    test('defines architecture output', () => {
      expect(content).toMatch(/##.*Architecture/);
    });

    test('defines implementation output', () => {
      expect(content).toMatch(/##.*Implementation/);
    });

    test('defines tests output', () => {
      expect(content).toMatch(/##.*Tests/);
    });

    test('defines documentation output', () => {
      expect(content).toMatch(/##.*Documentation/);
    });

    test('defines DevOps output', () => {
      expect(content).toMatch(/##.*DevOps/);
    });

    test('defines PR package output', () => {
      expect(content).toMatch(/##.*Pull Request/);
    });
  });

  describe('Practical Invocation Examples (Section X)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*X\..*INVOCATION EXAMPLES/i);
    });

    test('provides simple request example', () => {
      expect(content).toMatch(/Example 1.*Simple Request/i);
    });

    test('provides complex request example', () => {
      expect(content).toMatch(/Example 2.*Complex Request/i);
    });
  });

  describe('Guardrails and Constraints (Section XI)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*XI\..*GUARDRAILS AND CONSTRAINTS/i);
    });

    test('defines what prompt MUST do', () => {
      expect(content).toMatch(/What This Prompt MUST Do/i);
    });

    test('defines what prompt MUST NOT do', () => {
      expect(content).toMatch(/What This Prompt MUST NOT Do/i);
    });

    test('defines when to decline or defer', () => {
      expect(content).toMatch(/When to Decline or Defer/i);
    });
  });

  describe('Integration Checklist (Section XII)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*XII\..*INTEGRATION CHECKLIST/i);
    });

    test('covers meta-extrapolation', () => {
      expect(content).toMatch(/###.*Meta-Extrapolation/i);
    });

    test('covers implementation', () => {
      expect(content).toMatch(/###.*Implementation/i);
    });

    test('covers testing', () => {
      expect(content).toMatch(/###.*Testing/i);
    });

    test('covers documentation', () => {
      expect(content).toMatch(/###.*Documentation/i);
    });

    test('covers DevOps', () => {
      expect(content).toMatch(/###.*DevOps/i);
    });

    test('covers quality', () => {
      expect(content).toMatch(/###.*Quality/i);
    });

    test('covers governance', () => {
      expect(content).toMatch(/###.*Governance/i);
    });

    test('covers pull request', () => {
      expect(content).toMatch(/###.*Pull Request/i);
    });
  });

  describe('Recursive Self-Application (Section XIII)', () => {
    test('has dedicated section', () => {
      expect(content).toMatch(/##.*XIII\..*RECURSIVE SELF-APPLICATION/i);
    });

    test('demonstrates self-referential nature', () => {
      expect(content).toMatch(/self-referential/i);
      expect(content).toMatch(/self-improving/i);
    });
  });

  describe('Content Quality (Dogfooding)', () => {
    test('has no TODO markers (follows its own rules)', () => {
      // Allow "TODOs" as plural when discussing the concept, but not "TODO:" as action items
      const todoMatches = content.match(/TODO(?!s|\))/g);
      expect(todoMatches).toBeNull();
    });

    test('has no FIXME markers', () => {
      expect(content).not.toMatch(/FIXME/);
    });

    test('has no placeholder sections', () => {
      const placeholders = [
        '\\[INSERT',
        '\\[TBD',
        '\\[PLACEHOLDER',
        'Lorem ipsum',
      ];

      for (const placeholder of placeholders) {
        expect(content).not.toMatch(new RegExp(placeholder, 'i'));
      }
    });

    test('has version number', () => {
      expect(content).toMatch(/Version.*:.*\d+\.\d+\.\d+/i);
    });

    test('has last updated date', () => {
      expect(content).toMatch(/Last Updated.*:.*\d{4}-\d{2}-\d{2}/i);
    });

    test('has proper heading hierarchy', () => {
      const lines = content.split('\n');
      let lastLevel = 0;

      for (const line of lines) {
        const match = line.match(/^(#{1,6})\s/);
        if (match) {
          const currentLevel = match[1].length;
          // Heading levels should not skip (e.g., # followed by ###)
          if (lastLevel > 0) {
            expect(currentLevel - lastLevel).toBeLessThanOrEqual(1);
          }
          lastLevel = currentLevel;
        }
      }
    });

    test('has consistent formatting', () => {
      // Check for consistent checkbox format
      const checkboxes = content.match(/- \[.\]/g) || [];
      expect(checkboxes.length).toBeGreaterThan(50); // Should have comprehensive checklists
    });
  });

  describe('Metadata Validation', () => {
    test('has frontmatter or metadata block', () => {
      expect(content).toMatch(/Version.*:/i);
      expect(content).toMatch(/Layer.*:/i);
      expect(content).toMatch(/Scope.*:/i);
      expect(content).toMatch(/Last Updated.*:/i);
    });

    test('is marked as Prime Directive layer', () => {
      expect(content).toMatch(/Layer.*:.*Prime Directive/i);
    });

    test('has universal scope', () => {
      expect(content).toMatch(/Scope.*:.*Universal/i);
    });
  });

  describe('Conclusion Section', () => {
    test('has conclusion section', () => {
      expect(content).toMatch(/##.*XIV\..*CONCLUSION/i);
    });

    test('states when to use ultra-prime', () => {
      expect(content).toMatch(/Use it when/i);
    });

    test('emphasizes perfection and excellence', () => {
      expect(content).toMatch(/perfection/i);
      expect(content).toMatch(/excellence/i);
    });
  });

  describe('Structural Completeness', () => {
    test('has all 14 major sections', () => {
      for (let i = 1; i <= 14; i++) {
        const romanNumeral = toRoman(i);
        expect(content).toMatch(new RegExp(`##.*${romanNumeral}\\.`, 'i'));
      }
    });

    test('sections are in logical order', () => {
      const sectionOrder = [
        'PRIME DIRECTIVE',
        'META-EXTRAPOLATION ENGINE',
        'IMPLEMENTATION ENGINE',
        'PULL REQUEST',
        'INNOVATION',
        'PLACEHOLDER',
        'INTERPRETATION',
        'INTEGRATION',
        'SELF-IMPROVEMENT',
        'OUTPUT FORMAT',
        'INVOCATION EXAMPLES',
        'GUARDRAILS',
        'CHECKLIST',
        'SELF-APPLICATION',
        'CONCLUSION',
      ];

      let lastIndex = -1;
      for (const section of sectionOrder) {
        const index = content.indexOf(section);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    });
  });
});

/**
 * Helper function to convert number to Roman numeral
 */
function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
}
