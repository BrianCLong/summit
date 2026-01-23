export type Graph = {
  nodes: Array<{ id: string }>;
  edges: Array<Record<string, unknown>>;
};

export async function expandNeighbors(
  entityId: string,
  _hops = 1,
  _context: Record<string, unknown> = {},
): Promise<Graph> {
  return { nodes: [{ id: entityId }], edges: [] };
}

export async function expandNeighborhood(
  entityId: string,
  _hops = 2,
  _context: Record<string, unknown> = {},
): Promise<Graph> {
  return { nodes: [{ id: entityId }], edges: [] };
}
