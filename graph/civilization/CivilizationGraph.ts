export type CivilEdge =
  | { type: "CONTRACTED_WITH"; from: string; to: string }
  | { type: "VOTED_ON"; from: string; to: string }
  | { type: "FUNDED"; from: string; to: string };

export class CivilizationGraph {
  edges: CivilEdge[] = [];
  addEdge(edge: CivilEdge) {
    this.edges.push(edge);
  }
}
