import express from 'express';
import { z } from 'zod';
import pino from 'pino';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIV3 } from 'openapi-types';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
app.use(express.json());

const Schema = z.object({
  name: z.string(),
  email: z.string().email(),
});

app.post('/submit', (req, res) => {
  const result = Schema.safeParse(req.body);
  if (!result.success) {
    logger.warn({ errors: result.error.errors });
    return res.status(400).json({ error: 'Invalid input' });
  }
  logger.info({ user: result.data });
  res.json({ status: 'ok' });
});

const openapi: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Secure Service API', version: '1.0.0' },
  paths: { '/submit': { post: { summary: 'Submit user data' } } },
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));

app.listen(8080, () => logger.info('Listening on :8080'));
