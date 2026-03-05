import { createHasThreadRelation, HAS_THREAD_RELATION } from '../../src/graphrag/relations/taskThreadRelation';

describe('TaskThreadRelation', () => {
  it('should generate correct Cypher query', () => {
    const query = createHasThreadRelation('task1', 'thread1');
    expect(query).toBe(`MATCH (t:Task {id: 'task1'}), (th:TaskThread {id: 'thread1'}) MERGE (t)-[:${HAS_THREAD_RELATION}]->(th)`);
  });
});
