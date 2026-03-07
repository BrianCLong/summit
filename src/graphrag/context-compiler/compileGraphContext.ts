export interface GraphContextPackage {
  entities: string[];
  subgraph: {
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
  };
  allowedDatasets: string[];
  allowedTools: string[];
  evidenceIds: string[];
}

export interface GraphContextRequest {
  taskId: string;
  entities: string[];
  policyScope?: {
    datasets?: string[];
    tools?: string[];
  };
}

export function compileGraphContext(
  request: GraphContextRequest,
): GraphContextPackage {
  return {
    entities: request.entities,
    subgraph: {
      nodes: request.entities.map((entity) => ({ id: entity, type: 'entity' })),
      edges: [],
    },
    allowedDatasets: request.policyScope?.datasets ?? [],
    allowedTools: request.policyScope?.tools ?? [],
    evidenceIds: [`EVD-AOT2026-CONTEXT-${request.taskId}`],
  };
}
