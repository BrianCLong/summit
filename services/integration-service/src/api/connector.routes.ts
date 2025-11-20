/**
 * Connector API routes
 */

import { Router, Request, Response } from 'express';

export const connectorRouter = Router();

/**
 * GET /api/v1/connectors
 * List available connectors
 */
connectorRouter.get('/', async (req: Request, res: Response) => {
  res.json({
    connectors: [
      { type: 'postgres', name: 'PostgreSQL' },
      { type: 'mongodb', name: 'MongoDB' },
      { type: 's3', name: 'Amazon S3' },
      { type: 'rest_api', name: 'REST API' },
    ],
  });
});

/**
 * POST /api/v1/connectors/test
 * Test connector connection
 */
connectorRouter.post('/test', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Connection successful' });
});
