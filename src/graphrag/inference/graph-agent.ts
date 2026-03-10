import { GraphQuery } from '../core/graph-query';

export class GraphAgent {
  private queryEngine = new GraphQuery();
  infer(nodeId: string) {
    const data = this.queryEngine.query(nodeId);
    return `Inferred from ${data.id}`;
  }
}
