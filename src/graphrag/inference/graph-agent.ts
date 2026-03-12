import { GraphQuery } from '../core/graph-query.js';
import { emitRiskObservation } from '../../counter_ai/hooks.js';

export class GraphAgent {
  private queryEngine = new GraphQuery();
  infer(nodeId: string) {
    emitRiskObservation('agent:prompt_boundary', { agent_id: 'GraphAgent', node: nodeId });
    const data = this.queryEngine.query(nodeId);
    return `Inferred from ${data.id}`;
  }
}
