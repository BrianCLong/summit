import type { Express, Request, Response } from 'express';
import { MockLLM, generatorToReadable } from '../services/llm';
import { auth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { logAssistantEvent } from '../db/audit';
import { enqueueEnrichment } from '../workers/enrichment'; // New import
import { enqueue } from '../services/coalescer'; // Import enqueue for coalescing
import { httpLatency, httpErrors, tokensOut } from '../telemetry/metrics'; // New import
import { randomUUID } from 'node:crypto'; // New import
import { isSuspicious } from '../services/guard'; // New import
import { getCached, setCached } from '../cache/answers'; // New import
import {
  fetchGraphContext,
  fetchTextPassages,
  buildRagPrompt,
} from '../services/rag'; // New import
import { runCypher } from '../graph/neo4j'; // New import

// Simple experiment logging placeholder
function logExperiment(
  reqId: string,
  userId: string | null,
  exp: string,
  variant: string,
) {
  console.log(
    `[EXP] reqId=${reqId} userId=${userId} exp=${exp} variant=${variant}`,
  );
  // In a real system, this would send data to a telemetry system (e.g., Segment, Amplitude)
}

const llm = new MockLLM(); // swap with real adapter(s)

export function mountAssistant(app: Express, io?: any) {
  const write = (res: Response, obj: any) =>
    res.write(JSON.stringify(obj) + '\n');

  // POST /assistant/stream -> chunked text
  app.post(
    '/assistant/stream',
    auth(true),
    rateLimit(),
    async (req: Request, res: Response) => {
      const started = Date.now();
      const reqId = (req as any).reqId;
      const userId = (req as any).user?.sub || null;
      let input = (req.body?.input ?? '').toString(); // Changed to `let`
      const focusIds = req.body?.focusIds || []; // Assuming focusIds in body
      if (isSuspicious(input)) {
        httpErrors.inc({ path: '/assistant/stream', code: 'SUSPICIOUS_INPUT' });
        return res.status(400).json({ error: 'input_rejected' });
      }

      let experimentVariant = 'control';
      let cites: any[] = []; // Declare cites here
      if (process.env.ASSISTANT_RAG === '1') {
        // Feature flag check
        // Simple random assignment for demonstration (replace with proper tenant assignment)
        if (Math.random() < 0.1) {
          // 10% of requests go to RAG variant
          const graphContext = await fetchGraphContext({
            investigationId: reqId,
            focusIds,
          }); // Pass reqId as investigationId
          const textPassages = await fetchTextPassages(input);
          input = buildRagPrompt({
            question: input,
            graph: graphContext,
            passages: textPassages,
          });
          experimentVariant = 'rag_v1';
          cites = [
            ...graphContext.map((g: any) => ({ kind: 'graph', ...g })),
            ...textPassages.map((p: any) => ({ kind: 'doc', ...p })),
          ];
        }
      }
      logExperiment(reqId, userId, 'rag_experiment', experimentVariant); // Log experiment

      const tenant = (req as any).user?.org ?? 'public';
      const cached = await getCached(tenant, input);
      if (cached) {
        res.write(cached);
        return res.end();
      }

      // headers for chunked streaming
      res.set({
        'Content-Type': 'application/x-ndjson', // Changed Content-Type
        'Cache-Control': 'no-store',
        'Transfer-Encoding': 'chunked',
        'X-Accel-Buffering': 'no',
      });

      const ac = new AbortController();
      req.on('close', () => ac.abort());

      const end = httpLatency.startTimer({
        path: '/assistant/stream',
        method: 'POST',
      });
      let tokens = 0;
      let fullResponseText = ''; // To collect full response for cache
      try {
        write(res, { type: 'status', value: 'thinking' }); // Initial status
        for await (const token of llm.stream(input, ac.signal)) {
          tokens += 1;
          tokensOut.inc({ mode: 'fetch' }, 1);
          fullResponseText += token; // Collect full response
          write(res, { type: 'token', value: token }); // Structured token
        }
        write(res, { type: 'done', cites: cites }); // Pass collected cites
        res.end();
        end({ status: 200 });
        await setCached(tenant, input, fullResponseText, 60); // Cache full response
        await logAssistantEvent({
          reqId,
          userId,
          mode: 'fetch',
          input,
          tokens,
          ms: Date.now() - started,
          status: ac.signal.aborted ? 'cancel' : 'ok',
        });
        // Enqueue enrichment job
        await enqueueEnrichment({
          reqId,
          userId,
          input,
          outputPreview: 'assistant stream completed', // optional
          // investigationId: (req as any).investigationId, // Placeholder for investigationId
        });
      } catch (e: any) {
        if (!res.headersSent) res.status(500);
        res.end();
        httpErrors.inc({ path: '/assistant/stream', code: e?.code ?? 'ERR' });
        end({ status: 500 });
        await logAssistantEvent({
          reqId,
          userId,
          mode: 'fetch',
          input,
          tokens,
          ms: Date.now() - started,
          status: 'error',
        });
      }
    },
  );

  // GET /assistant/sse?q=... -> text/event-stream
  app.get(
    '/assistant/sse',
    auth(true),
    rateLimit(),
    async (req: Request, res: Response) => {
      const started = Date.now();
      const reqId = (req as any).reqId;
      const userId = (req as any).user?.sub || null;
      let input = (req.query.q ?? '').toString(); // Changed to `let`
      const focusIds = (req.query.focusIds as string[] | undefined) || []; // Assuming focusIds in query
      if (isSuspicious(input)) {
        httpErrors.inc({ path: '/assistant/sse', code: 'SUSPICIOUS_INPUT' });
        return res.status(400).json({ error: 'input_rejected' });
      }

      let experimentVariant = 'control';
      let cites: any[] = []; // Declare cites here
      if (process.env.ASSISTANT_RAG === '1') {
        // Feature flag check
        // Simple random assignment for demonstration (replace with proper tenant assignment)
        if (Math.random() < 0.1) {
          // 10% of requests go to RAG variant
          const graphContext = await fetchGraphContext({
            investigationId: reqId,
            focusIds,
          }); // Pass reqId as investigationId
          const textPassages = await fetchTextPassages(input);
          input = buildRagPrompt({
            question: input,
            graph: graphContext,
            passages: textPassages,
          });
          experimentVariant = 'rag_v1';
          cites = [
            ...graphContext.map((g: any) => ({ kind: 'graph', ...g })),
            ...textPassages.map((p: any) => ({ kind: 'doc', ...p })),
          ];
        }
      }
      logExperiment(reqId, userId, 'rag_experiment', experimentVariant); // Log experiment

      const tenant = (req as any).user?.org ?? 'public';
      const cached = await getCached(tenant, input);
      if (cached) {
        res.write(`data: ${cached}\n\n`);
        res.write(`data: [DONE]\n\n`);
        return res.end();
      }

      res.set({
        'Content-Type': 'application/x-ndjson', // Changed Content-Type
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders?.();

      const ac = new AbortController();
      req.on('close', () => ac.abort());

      const ping = setInterval(() => res.write(`: ping\n\n`), 15000);

      const end = httpLatency.startTimer({
        path: '/assistant/sse',
        method: 'GET',
      });
      let tokens = 0;
      try {
        write(res, { type: 'status', value: 'thinking' }); // Initial status
        for await (const tok of llm.stream(input, ac.signal)) {
          tokens += 1;
          tokensOut.inc({ mode: 'sse' }, 1);
          write(res, { type: 'token', value: tok }); // Structured token
        }
        write(res, { type: 'done', cites: cites }); // Pass collected cites
        clearInterval(ping);
        res.end();
        end({ status: 200 });
        await setCached(tenant, input, fullResponseText, 60); // Cache full response

        // Store Answer node + CITED edges; bind Request + User
        const answerId = `${reqId}:${Date.now()}`;
        // Enqueue the creation of Answer node and its relationships
        enqueue({
          type: 'audit', // Using audit type for this initial node creation
          payload: {
            type: 'answer_creation',
            userId,
            reqId,
            answerId,
            mode: 'sse',
            tokens,
            exp: experimentVariant,
            // This payload will need to be processed by writeAudits
          },
        });

        for (const c of cites) {
          if (c.kind === 'graph') {
            enqueue({
              type: 'cite',
              payload: { answerId, id: c.id, kind: 'entity' },
            });
          } else if (c.kind === 'doc') {
            enqueue({
              type: 'cite',
              payload: { answerId, id: c.source, kind: 'document' }, // Assuming c.source is the ID for documents
            });
          }
        }
        enqueue({
          type: 'audit',
          payload: {
            reqId,
            userId,
            mode: 'sse',
            input,
            tokens,
            ms: Date.now() - started,
            status: ac.signal.aborted ? 'cancel' : 'ok',
          },
        });
        // Enqueue enrichment job
        await enqueueEnrichment({
          reqId,
          userId,
          input,
          outputPreview: 'assistant stream completed', // optional
          // investigationId: (req as any).investigationId, // Placeholder for investigationId
        });
      } catch (e: any) {
        clearInterval(ping);
        res.end();
        httpErrors.inc({ path: '/assistant/sse', code: e?.code ?? 'ERR' });
        end({ status: 500 });
        await logAssistantEvent({
          reqId,
          userId,
          mode: 'sse',
          input,
          tokens,
          ms: Date.now() - started,
          status: 'error',
        });
      }
    },
  );

  // Socket.IO wiring (optional; client already supports it)
  if (io) {
    io.on('connection', (socket: any) => {
      socket.on(
        'assistant:ask',
        async ({
          input,
          focusIds = [],
        }: {
          input: string;
          focusIds?: string[];
        }) => {
          // Added focusIds
          if (isSuspicious(input)) {
            socket.emit('assistant:error', 'input_rejected');
            return;
          }

          let experimentVariant = 'control';
          let cites: any[] = []; // Declare cites here
          if (process.env.ASSISTANT_RAG === '1') {
            // Feature flag check
            // Simple random assignment for demonstration (replace with proper tenant assignment)
            if (Math.random() < 0.1) {
              // 10% of requests go to RAG variant
              const graphContext = await fetchGraphContext({
                investigationId: reqId,
                focusIds,
              }); // Pass reqId as investigationId
              const textPassages = await fetchTextPassages(input);
              input = buildRagPrompt({
                question: input,
                graph: graphContext,
                passages: textPassages,
              });
              experimentVariant = 'rag_v1';
              cites = [
                ...graphContext.map((g: any) => ({ kind: 'graph', ...g })),
                ...textPassages.map((p: any) => ({ kind: 'doc', ...p })),
              ];
            }
          }
          logExperiment(reqId, userId, 'rag_experiment', experimentVariant); // Log experiment
          const tenant = socket.handshake.auth?.org ?? 'public'; // Assuming org from Socket.IO auth
          const cached = await getCached(tenant, input);
          if (cached) {
            socket.emit('assistant:token', cached);
            socket.emit('assistant:done');
            return;
          }

          const ac = new AbortController();
          socket.on('disconnect', () => ac.abort());
          const started = Date.now();
          const reqId =
            socket.handshake.headers['x-request-id'] || randomUUID(); // Assuming requestId middleware for HTTP, or generate for Socket.IO
          const userId = socket.handshake.auth?.token ? 'socket_user' : null; // Placeholder for actual user ID from Socket.IO auth
          let tokens = 0;
          let fullResponseText = ''; // To collect full response for cache
          try {
            socket.emit('assistant:token', {
              type: 'status',
              value: 'thinking',
            }); // Initial status
            for await (const tok of llm.stream(input, ac.signal)) {
              tokens += 1;
              tokensOut.inc({ mode: 'socket' }, 1);
              fullResponseText += tok; // Collect full response
              socket.emit('assistant:token', { type: 'token', value: tok }); // Structured token
            }
            socket.emit('assistant:done', { type: 'done', cites: cites }); // Pass collected cites
            await setCached(tenant, input, fullResponseText, 60); // Cache full response

            // Store Answer node + CITED edges; bind Request + User
            const answerId = `${reqId}:${Date.now()}`;
            // Enqueue the creation of Answer node and its relationships
            enqueue({
              type: 'audit', // Using audit type for this initial node creation
              payload: {
                type: 'answer_creation',
                userId,
                reqId,
                answerId,
                mode: 'socket',
                tokens,
                exp: experimentVariant,
                // This payload will need to be processed by writeAudits
              },
            });

            for (const c of cites) {
              if (c.kind === 'graph') {
                enqueue({
                  type: 'cite',
                  payload: { answerId, id: c.id, kind: 'entity' },
                });
              } else if (c.kind === 'doc') {
                enqueue({
                  type: 'cite',
                  payload: { answerId, id: c.id, kind: 'document' }, // Assuming c.id is the ID for documents
                });
              }
            }
            enqueue({
              type: 'audit',
              payload: {
                reqId,
                userId,
                mode: 'socket',
                input,
                tokens,
                ms: Date.now() - started,
                status: ac.signal.aborted ? 'cancel' : 'ok',
              },
            });
            // Enqueue enrichment job
            await enqueueEnrichment({
              reqId,
              userId,
              input,
              outputPreview: 'assistant stream completed', // optional
              // investigationId: (req as any).investigationId, // Placeholder for investigationId
            });
          } catch (e: any) {
            socket.emit('assistant:error', 'stream_failed');
            await logAssistantEvent({
              reqId,
              userId,
              mode: 'socket',
              input,
              tokens,
              ms: Date.now() - started,
              status: 'error',
            });
          }
        },
      );
    });
  }
}
