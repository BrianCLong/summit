import http from 'node:http';
import { URL } from 'node:url';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

export type HttpServerConfig = {
  port: number;
  host?: string;
  basePath?: string;
};

export async function httpServer(
  server: McpServer,
  config: HttpServerConfig,
): Promise<http.Server> {
  const basePath = config.basePath ?? '/mcp';
  const messagePath = `${basePath}/messages`;
  let activeTransport: SSEServerTransport | null = null;

  const nodeServer = http.createServer(async (req, res) => {
    const requestUrl = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? 'localhost'}`,
    );

    if (req.method === 'GET' && requestUrl.pathname === basePath) {
      if (activeTransport) {
        await activeTransport.close().catch(() => undefined);
        activeTransport = null;
      }

      const transport = new SSEServerTransport(messagePath, res);
      activeTransport = transport;
      transport.onclose = () => {
        activeTransport = null;
      };
      transport.onerror = () => {
        activeTransport = null;
      };

      try {
        await server.connect(transport);
      } catch (error) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Failed to establish SSE transport');
        }
        activeTransport = null;
      }
      return;
    }

    if (req.method === 'POST' && requestUrl.pathname === messagePath) {
      const sessionId = requestUrl.searchParams.get('sessionId');
      if (
        !sessionId ||
        !activeTransport ||
        activeTransport.sessionId !== sessionId
      ) {
        res.statusCode = 404;
        res.end('Session not found');
        return;
      }

      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const parsedBody = body.length > 0 ? JSON.parse(body) : undefined;
          await activeTransport!.handlePostMessage(req, res, parsedBody);
        } catch (error) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end('Failed to handle message');
          }
        }
      });

      req.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Request stream error');
        }
      });
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  await new Promise<void>((resolve) => {
    nodeServer.listen(config.port, config.host ?? '0.0.0.0', resolve);
  });

  return nodeServer;
}
