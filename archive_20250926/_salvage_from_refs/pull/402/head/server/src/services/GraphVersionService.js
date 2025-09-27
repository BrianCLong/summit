const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

class GraphVersionService {
  constructor() {
    this.snapshots = new Map();
  }

  /**
   * Save a snapshot of the graph.
   * @param {string} id
   * @param {{nodes: Array, edges: Array}} graph
   */
  saveSnapshot(id, graph) {
    this.snapshots.set(id, graph);
  }

  /**
   * Generate a diff between two snapshots.
   * @param {string} aId
   * @param {string} bId
   */
  diffSnapshots(aId, bId) {
    const a = this.snapshots.get(aId) || { nodes: [], edges: [] };
    const b = this.snapshots.get(bId) || { nodes: [], edges: [] };

    const toMap = (arr) => new Map(arr.map((o) => [o.id, o]));
    const aNodes = toMap(a.nodes);
    const bNodes = toMap(b.nodes);
    const aEdges = toMap(a.edges);
    const bEdges = toMap(b.edges);

    const addedNodes = [];
    const removedNodes = [];
    const modifiedNodes = [];
    const addedEdges = [];
    const removedEdges = [];
    const modifiedEdges = [];

    for (const [id, node] of aNodes) {
      if (!bNodes.has(id)) {
        removedNodes.push(id);
      } else if (!deepEqual(node, bNodes.get(id))) {
        modifiedNodes.push(id);
      }
    }
    for (const id of bNodes.keys()) {
      if (!aNodes.has(id)) addedNodes.push(id);
    }

    for (const [id, edge] of aEdges) {
      if (!bEdges.has(id)) {
        removedEdges.push(id);
      } else if (!deepEqual(edge, bEdges.get(id))) {
        modifiedEdges.push(id);
      }
    }
    for (const id of bEdges.keys()) {
      if (!aEdges.has(id)) addedEdges.push(id);
    }

    return {
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedEdges,
      removedEdges,
      modifiedEdges,
    };
  }
}

module.exports = GraphVersionService;
