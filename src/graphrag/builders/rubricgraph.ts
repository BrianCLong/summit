import crypto from 'crypto';

interface Node {
  id: string;
  label: string;
  properties: Record<string, any>;
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

export class RubricGraphBuilder {
  private nodes: Map<string, Node> = new Map();
  private edges: Set<string> = new Set();
  private _edgesArray: Edge[] = [];

  addInstruction(instruction: string): string {
    const hash = crypto.createHash('sha256').update(instruction).digest('hex').substring(0, 8);
    const id = `INST-${hash}`;
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, label: 'Instruction', properties: { text: instruction } });
    }
    return id;
  }

  addAtomicRubric(criterion: string, instructionId: string): string {
    const hash = crypto.createHash('sha256').update(criterion).digest('hex').substring(0, 8);
    const id = `ARUB-${hash}`;
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, label: 'RubricAtomic', properties: { criterion } });
      this.addEdge(id, instructionId, 'DERIVES_FROM');
    }
    return id;
  }

  addEvalRun(evidenceId: string, model: string, output: string, score: number, instructionId: string): string {
    const id = `EVAL-${evidenceId}`;
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, label: 'EvalRun', properties: { evidenceId, model, output, score } });
      this.addEdge(id, instructionId, 'EVALUATES');
    }
    return id;
  }

  addEdge(source: string, target: string, type: string) {
    const edgeKey = `${source}-${type}-${target}`;
    if (!this.edges.has(edgeKey)) {
      this.edges.add(edgeKey);
      this._edgesArray.push({ source, target, type });
    }
  }

  export() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this._edgesArray
    };
  }
}
