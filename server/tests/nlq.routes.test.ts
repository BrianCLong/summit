import express from 'express';
import request from 'supertest';
import { router } from '../../services/nlq/src/index.js';
import { describe, it, expect } from '@jest/globals';

const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? describe.skip : describe;

const app = express();
app.use(express.json());
app.use(router);

describeIf('nlq routes', () => {
  it('compiles natural language to cypher', async () => {
    const res = await request(app)
      .post('/nlq/compile')
      .send({ nl: 'find all people' });
    expect(res.body.cypher).toBe('MATCH (p:Person) RETURN p LIMIT $limit');
  });
});
