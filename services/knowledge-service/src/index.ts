
// services/knowledge-service/src/index.ts
import express from 'express';
import { indexRepository } from './indexer';

const app = express();
app.use(express.json());

// In-memory store for demonstration
const vectorStore: any = {};
const graphStore: any = {};

// Endpoint to trigger indexing
app.post('/index', async (req, res) => {
  console.log('Received request to index repository...');
  // In a real app, this would be an async job.
  await indexRepository({ vectorStore, graphStore });
  res.status(202).send({ status: 'indexing_started' });
});

// Endpoint to query the knowledge OS
app.post('/query', (req, res) => {
  const { query } = req.body;
  console.log(`Received query: ${query}`);
  // TODO: Implement query logic against vector and graph stores
  res.send({ results: [{ type: 'doc', path: 'docs/ADR-050.md', score: 0.9 }] });
});

const port = process.env.PORT || 8081;
app.listen(port, () => {
  console.log(`knowledge-service listening on port ${port}`);
});
