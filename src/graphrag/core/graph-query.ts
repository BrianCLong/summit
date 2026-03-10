export class GraphQuery {
  query(nodeId: string) {
    return { id: nodeId, data: 'node data' };
  }
}
