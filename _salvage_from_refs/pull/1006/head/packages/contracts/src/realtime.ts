export const RT_NS = {
  COLLAB: '/rt/collab',
} as const;

export const EVT = {
  PRESENCE: 'presence',
  GRAPH_MUT: 'graph:mut',
} as const;

export interface PresencePayload {
  userId: string;
  [key: string]: unknown;
}

export interface GraphMutatePayload {
  userId: string;
  graphId: string;
  [key: string]: unknown;
}
