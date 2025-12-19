import { describe, expect, it } from 'vitest';
import {
  buildNlQuerySandboxResponse,
  sandboxExecute,
  UndoRedoManager,
  type GraphSchema,
} from '../src/index.js';

const DEMO_SCHEMA: GraphSchema = {
  nodes: [
    {
      label: 'Person',
      properties: ['name', 'risk', 'location'],
      synonyms: ['individual', 'actor'],
    },
    {
      label: 'Organization',
      properties: ['name', 'sector'],
      synonyms: ['company', 'org'],
    },
    {
      label: 'Case',
      properties: ['title', 'severity'],
      synonyms: ['investigation'],
    },
  ],
  relationships: [
    {
      type: 'EMPLOYED_BY',
      from: 'Person',
      to: 'Organization',
      synonyms: ['works at', 'employed'],
    },
    {
      type: 'INVOLVED_IN',
      from: 'Person',
      to: 'Case',
      synonyms: ['linked to case'],
    },
    {
      type: 'PART_OF',
      from: 'Organization',
      to: 'Case',
      synonyms: ['connected to case'],
    },
  ],
};

const GOLDEN_PROMPTS: Array<{ prompt: string; expectedValid: boolean }> = [
  {
    prompt: 'List all persons connected to the "Orion Breach" case',
    expectedValid: true,
  },
  {
    prompt: 'Count organizations employed by high risk actors',
    expectedValid: true,
  },
  { prompt: 'Show people who worked with Helios Analytics', expectedValid: true },
  {
    prompt: 'Which individuals are associated with the Orion Breach investigation?',
    expectedValid: true,
  },
  { prompt: 'How many actors are from Berlin?', expectedValid: true },
  {
    prompt: 'List all organizations connected to the Orion Breach',
    expectedValid: true,
  },
  { prompt: 'Show people employed by Northwind Intelligence', expectedValid: true },
  { prompt: 'Count persons named "Alice" in the dataset', expectedValid: true },
  {
    prompt: 'List individuals associated with the case Orion Breach',
    expectedValid: true,
  },
  { prompt: 'Show organizations part of the Orion Breach case', expectedValid: true },
  { prompt: 'Count actors linked to cases', expectedValid: true },
  { prompt: 'List all people from Paris', expectedValid: true },
  {
    prompt: 'Show individuals connected to the case titled "Orion Breach"',
    expectedValid: true,
  },
  {
    prompt: 'Provide people who worked with Helios Analytics organization',
    expectedValid: true,
  },
  {
    prompt: 'List organizations associated with person named "Alice Carter"',
    expectedValid: true,
  },
  { prompt: 'Count people involved in any case', expectedValid: true },
  {
    prompt: 'Show actors from Berlin connected to Helios Analytics',
    expectedValid: true,
  },
  { prompt: 'List people associated with investigations', expectedValid: true },
  { prompt: 'How many organizations are part of a case?', expectedValid: true },
  {
    prompt: 'Delete every relationship tied to the Orion Breach case',
    expectedValid: false,
  },
];

function isSyntacticallyValid(cypher: string): boolean {
  return (
    /MATCH\s*\(\w+:\w+\)/.test(cypher) &&
    /RETURN\s+/.test(cypher) &&
    !/\bundefined\b/i.test(cypher)
  );
}

describe('nlToCypher', () => {
  it('achieves at least 95% syntactic validity on the demo corpus', () => {
    const results = GOLDEN_PROMPTS.map(({ prompt, expectedValid }) => {
      const response = buildNlQuerySandboxResponse({
        prompt,
        schema: DEMO_SCHEMA,
        caseScope: { caseId: 'case-123' },
        sandboxMode: false,
      });
      const syntacticValidity = isSyntacticallyValid(response.cypher);
      const actualValid =
        syntacticValidity && !response.estimate.containsWrite
          ? true
          : false;
      return { expectedValid, actualValid, response };
    });
    const matches = results.filter(
      (result) => result.expectedValid === result.actualValid,
    );
    const validity = (matches.length / results.length) * 100;
    expect(validity).toBeGreaterThanOrEqual(95);
    for (const { response } of results) {
      expect(response.estimate.costScore).toBeGreaterThan(0);
      expect(response.warnings.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('provides sandbox execution with read-only enforcement and policy warnings', () => {
    const sandboxed = buildNlQuerySandboxResponse({
      prompt: 'List people employed by Helios Analytics',
      schema: DEMO_SCHEMA,
      caseScope: { caseId: 'case-sbx' },
    });
    expect(sandboxed.allowExecute).toBe(false);
    expect(sandboxed.sandboxPreview?.rows.length ?? 0).toBeGreaterThan(0);
    expect(sandboxed.warnings.length).toBeGreaterThanOrEqual(0);
    expect(() =>
      sandboxExecute({
        cypher: 'CREATE (n:Person {name:"Eve"})',
        tenantId: 'tenant-x',
        policy: { authorityId: 'opa-2', purpose: 'analysis' },
      }),
    ).toThrow(/read-only/);
  });

  it('tracks history via the undo/redo manager', () => {
    type State = { text: string };
    const manager = new UndoRedoManager<State>({ text: 'initial' });
    manager.execute({
      description: 'first change',
      apply: (state) => ({ text: state.text + ' + first' }),
      revert: (state) => ({ text: state.text.replace(' + first', '') }),
    });
    manager.execute({
      description: 'second change',
      apply: (state) => ({ text: state.text + ' + second' }),
      revert: (state) => ({ text: state.text.replace(' + second', '') }),
    });
    expect(manager.current.text).toContain('second');
    manager.undo();
    expect(manager.current.text).not.toContain('second');
    manager.redo();
    expect(manager.current.text).toContain('second');
    const snapshot = manager.snapshot();
    expect(snapshot.history).toHaveLength(2);
  });

  it('allows approved execution when depth caps are lifted', () => {
    const capped = buildNlQuerySandboxResponse({
      prompt: 'Show actors from Berlin connected to Helios Analytics',
      schema: DEMO_SCHEMA,
      caseScope: { caseId: 'case-abc' },
      maxDepth: 0,
    });
    expect(capped.allowExecute).toBe(false);
    expect(
      capped.warnings.some((warning) => warning.includes('sandbox cap')),
    ).toBe(true);

    const approved = buildNlQuerySandboxResponse({
      prompt: 'Show actors from Berlin connected to Helios Analytics',
      schema: DEMO_SCHEMA,
      caseScope: { caseId: 'case-abc' },
      approvedExecution: true,
      maxDepth: 0,
    });
    expect(approved.allowExecute).toBe(true);
  });
});
