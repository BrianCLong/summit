import request from 'supertest';
import express from 'express';

describe('Express 5 centralized errors', () => {
  it('catches async throw', async () => {
    const app = express();
    const r = express.Router();
    r.get('/boom', async () => {
      throw new Error('boom');
    });
    app.use('/test', r);
    // Centralized error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    app.use(
      (
        err: unknown,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction,
      ) => {
        const msg =
          err instanceof Error ? err.message : 'Internal Server Error';
        res.status(500).json({ error: msg });
      },
    );
    const res = await request(app).get('/test/boom');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/boom/);
  });
});
