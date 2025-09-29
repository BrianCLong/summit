import { GraphRAGService } from '../src/services/GraphRAGService';

test('graphRagAnswer validates JSON schema', async () => {
  const svc = new GraphRAGService();
  const res = await svc.answer({ investigationId:'inv1', question:'Test?' });
  expect(res.answer.length).toBeGreaterThan(0);
  expect(res.why_paths).toBeInstanceOf(Array);
});