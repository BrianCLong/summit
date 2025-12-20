import { describe, expect, it } from 'vitest';
import {
  nlToCypher,
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

const PROMPTS = [
  'List all persons connected to the "Orion Breach" case',
  'Count organizations employed by high risk actors',
  'Show people who worked with Helios Analytics',
  'Which individuals are associated with the Orion Breach investigation?',
  'How many actors are from Berlin?',
  'List all organizations connected to the Orion Breach',
  'Show people employed by Northwind Intelligence',
  'Count persons named "Alice" in the dataset',
  'List individuals associated with the case Orion Breach',
  'Show organizations part of the Orion Breach case',
  'Count actors linked to cases',
  'List all people from Paris',
  'Show individuals connected to the case titled "Orion Breach"',
  'Provide people who worked with Helios Analytics organization',
  'List organizations associated with person named "Alice Carter"',
  'Count people involved in any case',
  'Show actors from Berlin connected to Helios Analytics',
  'List people associated with investigations',
  'How many organizations are part of a case?',
  'List actors who collaborated with Helios Analytics',
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
    const results = PROMPTS.map((prompt) =>
      nlToCypher(prompt, { schema: DEMO_SCHEMA }),
    );
    const valid = results.filter((result) =>
      isSyntacticallyValid(result.cypher),
    );
    const validity = (valid.length / results.length) * 100;
    expect(validity).toBeGreaterThanOrEqual(95);
    for (const result of results) {
      expect(result.costEstimate.estimatedLatencyMs).toBeGreaterThan(0);
      expect(result.citations.length).toBeGreaterThan(0);
    }
  });

  it('provides sandbox execution with read-only enforcement and policy warnings', () => {
    const { cypher } = nlToCypher('List people employed by Helios Analytics', {
      schema: DEMO_SCHEMA,
    });
    const sandbox = sandboxExecute({
      cypher,
      tenantId: 'prod-eu-1',
      policy: { authorityId: 'opa-1', purpose: 'exploration' },
    });
    expect(sandbox.rows.length).toBeGreaterThan(0);
    expect(sandbox.columns).toContain(
      cypher.match(/MATCH\s*\((\w+):/i)?.[1] ?? 'n',
    );
    expect(sandbox.policyWarnings.length).toBeGreaterThan(0);
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
});
