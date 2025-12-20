import { readFileSync } from 'fs';
import path from 'path';
import {
  BundleCase,
  BundleEvidence,
  BundleGraphSubset,
  BundleNote,
  CaseBundleStore,
} from './types.js';

interface FixtureShape {
  cases: (BundleCase & {
    notes?: string[];
    evidence?: string[];
    graphNodes?: string[];
  })[];
  evidence: BundleEvidence[];
  notes: BundleNote[];
  graph: BundleGraphSubset;
}

export class FixtureCaseBundleStore implements CaseBundleStore {
  private data: FixtureShape;

  constructor(
    fixturePath = path.join(
      process.cwd(),
      'src',
      'cases',
      'bundles',
      'fixtures',
      'basic-data.json',
    ),
  ) {
    this.data = { cases: [], evidence: [], notes: [], graph: { nodes: [], edges: [] } } as FixtureShape;
    this.loadFixture(fixturePath);
  }

  private loadFixture(fixturePath: string) {
    const file = readFileSync(fixturePath, 'utf-8');
    this.data = JSON.parse(file) as FixtureShape;
  }

  async getCases(caseIds: string[]): Promise<BundleCase[]> {
    return this.data.cases.filter((c) => caseIds.includes(c.id)).map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      description: c.description,
      compartment: c.compartment,
      policyLabels: c.policyLabels,
      metadata: c.metadata,
    }));
  }

  async getEvidence(caseIds: string[]): Promise<BundleEvidence[]> {
    return this.data.evidence.filter((e) => caseIds.includes(e.caseId));
  }

  async getNotes(caseIds: string[]): Promise<BundleNote[]> {
    return this.data.notes.filter((n) => caseIds.includes(n.caseId));
  }

  async getGraphSubset(caseIds: string[]): Promise<BundleGraphSubset> {
    const nodes = this.data.graph.nodes.filter((n) => !n.caseId || caseIds.includes(n.caseId));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = this.data.graph.edges.filter(
      (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
    );
    return { nodes, edges };
  }
}
