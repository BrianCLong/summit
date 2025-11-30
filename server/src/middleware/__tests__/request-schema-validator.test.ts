import express from 'express';
import request from 'supertest';
import Joi from 'joi';
import { z } from 'zod';
import { buildRequestValidator, createSqlInjectionGuard } from '../request-schema-validator.js';

describe('request schema validator middleware', () => {
  const zodSchema = z.object({
    name: z.string().min(1),
    count: z.coerce.number().int().min(1).max(5).default(1),
  });

  const joiSchema = Joi.object({
    name: Joi.string().required(),
    count: Joi.number().integer().min(1).max(5).default(1),
  });

  it('sanitizes and validates payloads with both Joi and Zod', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/test',
      buildRequestValidator({ target: 'body', zodSchema, joiSchema }),
      (req, res) => {
        res.json({ body: req.body });
      },
    );

    const res = await request(app)
      .post('/test')
      .send({ name: '<script>alert(1)</script>', count: 2 });

    expect(res.status).toBe(200);
    expect(res.body.body.name).not.toContain('<script');
    expect(res.body.body.count).toBe(2);
  });

  it('rejects invalid payloads early', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/test',
      buildRequestValidator({ target: 'body', zodSchema, joiSchema }),
      (req, res) => {
        res.json({ body: req.body });
      },
    );

    const res = await request(app).post('/test').send({ count: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('blocks suspicious SQL-like payloads', async () => {
    const app = express();
    app.use(express.json());
    app.post('/test', createSqlInjectionGuard(), (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(app)
      .post('/test')
      .send({ query: 'SELECT * FROM users; DROP TABLE users;' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Suspicious input detected');
  });
});
