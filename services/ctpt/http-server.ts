import http, { IncomingMessage, ServerResponse } from 'node:http';
import { CanaryTokenPlantingTracebackService } from './ctpt-service';
import { CallbackEvent, PlantHoneytokenInput } from './types';

function parseBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req
      .on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      .on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve(body ? (JSON.parse(body) as T) : ({} as T));
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => reject(error));
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function createCTPTHttpHandler(service: CanaryTokenPlantingTracebackService): http.RequestListener {
  return async (req, res) => {
    if (!req.url) {
      res.writeHead(404).end();
      return;
    }
    const { url, method = 'GET' } = req;
    if (url === '/ctpt/tokens' && method === 'POST') {
      try {
        const body = await parseBody<PlantHoneytokenInput>(req);
        if (!body.type || !body.plantedBy || !body.sourceSystem || !body.ttlSeconds) {
          sendJson(res, 400, { message: 'Missing required fields' });
          return;
        }
        const token = service.plantToken({
          type: body.type,
          plantedBy: body.plantedBy,
          sourceSystem: body.sourceSystem,
          tags: body.tags,
          ttlSeconds: body.ttlSeconds,
          metadata: body.metadata,
        });
        sendJson(res, 201, {
          id: token.id,
          tokenValue: token.tokenValue,
          tokenType: token.type,
          displayName: token.displayName,
          expiresAt: token.expiresAt.toISOString(),
          leakScore: token.leakScore,
        });
      } catch (error) {
        sendJson(res, 400, { message: (error as Error).message });
      }
      return;
    }

    if (url === '/ctpt/callbacks' && method === 'POST') {
      try {
        const body = await parseBody<CallbackEvent>(req);
        if (!body.tokenValue || !body.channel) {
          sendJson(res, 400, { message: 'Missing required fields' });
          return;
        }
        const attribution = service.recordCallback(body);
        if (!attribution) {
          sendJson(res, 404, { message: 'Token not found or expired' });
          return;
        }
        sendJson(res, 202, {
          tokenId: attribution.token.id,
          leakScore: attribution.token.leakScore,
          confidence: attribution.confidence,
        });
      } catch (error) {
        sendJson(res, 400, { message: (error as Error).message });
      }
      return;
    }

    if (url === '/ctpt/dashboard' && method === 'GET') {
      const dashboard = service.getDashboard();
      sendJson(res, 200, {
        totals: dashboard.totals,
        tokensByType: dashboard.tokensByType,
        topAlerts: dashboard.topAlerts.map((alert) => ({
          ...alert,
          lastSeen: alert.lastSeen ? alert.lastSeen.toISOString() : null,
        })),
        recentActivity: dashboard.recentActivity.map((activity) => ({
          ...activity,
          observedAt: activity.observedAt.toISOString(),
        })),
      });
      return;
    }

    res.writeHead(404).end();
  };
}

export function createCTPTServer(service: CanaryTokenPlantingTracebackService): http.Server {
  return http.createServer(createCTPTHttpHandler(service));
}
