export const HAS_THREAD_RELATION = 'HAS_THREAD';

export function createHasThreadRelation(taskId: string, threadId: string): string {
  return `MATCH (t:Task {id: '${taskId}'}), (th:TaskThread {id: '${threadId}'}) MERGE (t)-[:${HAS_THREAD_RELATION}]->(th)`;
}
