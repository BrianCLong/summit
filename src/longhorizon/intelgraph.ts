import {
  CandidateRecord,
  EvaluationRecord,
  MemoryNode,
  PatchRecord,
  RunRecord,
} from './types';
import { sha256 } from './utils';

export interface GraphNode {
  id: string;
  type: 'Run' | 'Step' | 'Candidate' | 'Evaluation' | 'Patch' | 'MemoryNode';
  payload: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
}

export class IntelGraphStore {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();

  addRun(run: RunRecord): void {
    this.addNode('Run', run.id, run as unknown as Record<string, unknown>);
    run.steps.forEach((stepId) => this.addEdge(run.id, stepId, 'RunToStep'));
    run.candidates.forEach((candidateId) =>
      this.addEdge(run.id, candidateId, 'RunToCandidate'),
    );
    run.memoryNodes.forEach((nodeId) =>
      this.addEdge(run.id, nodeId, 'RunToMemory'),
    );
  }

  addCandidate(candidate: CandidateRecord): void {
    this.addNode('Candidate', candidate.id, candidate as unknown as Record<string, unknown>);
    this.addEdge(candidate.id, candidate.patch.id, 'CandidateToPatch');
    if (candidate.evaluation) {
      this.addEdge(candidate.id, candidate.evaluation.id, 'CandidateToEvaluation');
    }
  }

  addEvaluation(evaluation: EvaluationRecord): void {
    this.addNode(
      'Evaluation',
      evaluation.id,
      evaluation as unknown as Record<string, unknown>,
    );
  }

  addPatch(patch: PatchRecord): void {
    this.addNode('Patch', patch.id, patch as unknown as Record<string, unknown>);
  }

  addMemoryNode(node: MemoryNode): void {
    this.addNode('MemoryNode', node.id, node as unknown as Record<string, unknown>);
  }

  export(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  private addNode(type: GraphNode['type'], id: string, payload: Record<string, unknown>): void {
    this.nodes.set(id, { id, type, payload });
  }

  private addEdge(from: string, to: string, type: string): void {
    const id = sha256(`${from}:${to}:${type}`);
    this.edges.set(id, { id, from, to, type });
  }
}
