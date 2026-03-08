"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const taskThreadRelation_1 = require("../../src/graphrag/relations/taskThreadRelation");
describe('TaskThreadRelation', () => {
    it('should generate correct Cypher query', () => {
        const query = (0, taskThreadRelation_1.createHasThreadRelation)('task1', 'thread1');
        expect(query).toBe(`MATCH (t:Task {id: 'task1'}), (th:TaskThread {id: 'thread1'}) MERGE (t)-[:${taskThreadRelation_1.HAS_THREAD_RELATION}]->(th)`);
    });
});
