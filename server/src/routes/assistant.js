"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountAssistant = mountAssistant;
const llm_js_1 = require("../services/llm.js");
const auth_js_1 = require("../middleware/auth.js");
const rateLimit_js_1 = require("../middleware/rateLimit.js");
const audit_js_1 = require("../db/audit.js");
const enrichment_js_1 = require("../workers/enrichment.js"); // New import
const coalescer_js_1 = require("../services/coalescer.js"); // Import enqueue for coalescing
// import { httpLatency, httpErrors, tokensOut } from '../telemetry/metrics.js'; // New import
const node_crypto_1 = require("node:crypto"); // New import
const guard_js_1 = require("../services/guard.js"); // New import
const answers_js_1 = require("../cache/answers.js"); // New import
const rag_js_1 = require("../services/rag.js"); // New import
// import { runCypher } from '../graph/neo4j.js'; // New import
// Mock metrics for now to fix TS errors
const httpLatency = { startTimer: () => () => { } };
const httpErrors = { inc: () => { } };
const tokensOut = { inc: () => { } };
// Simple experiment logging placeholder
function logExperiment(reqId, userId, exp, variant) {
    console.log(`[EXP] reqId=${reqId} userId=${userId} exp=${exp} variant=${variant}`);
    // In a real system, this would send data to a telemetry system (e.g., Segment, Amplitude)
}
const llm = new llm_js_1.MockLLM(); // swap with real adapter(s)
function mountAssistant(app, io) {
    const write = (res, obj) => res.write(JSON.stringify(obj) + '\n');
    // POST /assistant/stream -> chunked text
    app.post('/assistant/stream', (0, auth_js_1.auth)(true), (0, rateLimit_js_1.rateLimit)(), async (req, res) => {
        const started = Date.now();
        const reqId = req.reqId;
        const userId = req.user?.sub || null;
        let input = (req.body?.input ?? '').toString(); // Changed to `let`
        const focusIds = req.body?.focusIds || []; // Assuming focusIds in body
        if ((0, guard_js_1.isSuspicious)(input)) {
            httpErrors.inc();
            return res.status(400).json({ error: 'input_rejected' });
        }
        let experimentVariant = 'control';
        let cites = []; // Declare cites here
        if (process.env.ASSISTANT_RAG === '1') {
            // Feature flag check
            // Simple random assignment for demonstration (replace with proper tenant assignment)
            if (Math.random() < 0.1) {
                // 10% of requests go to RAG variant
                const graphContext = await (0, rag_js_1.fetchGraphContext)({
                    investigationId: reqId,
                    focusIds,
                }); // Pass reqId as investigationId
                const textPassages = await (0, rag_js_1.fetchTextPassages)(input);
                input = (0, rag_js_1.buildRagPrompt)({
                    question: input,
                    graph: graphContext,
                    passages: textPassages,
                });
                experimentVariant = 'rag_v1';
                cites = [
                    ...graphContext.map((g) => ({ kind: 'graph', ...g })),
                    ...textPassages.map((p) => ({ kind: 'doc', ...p })),
                ];
            }
        }
        logExperiment(reqId, userId, 'rag_experiment', experimentVariant); // Log experiment
        const tenant = req.user?.org ?? 'public';
        const cached = await (0, answers_js_1.getCached)(tenant, input);
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
        const end = httpLatency.startTimer();
        let tokens = 0;
        let fullResponseText = ''; // To collect full response for cache
        try {
            write(res, { type: 'status', value: 'thinking' }); // Initial status
            for await (const token of llm.stream(input, ac.signal)) {
                tokens += 1;
                tokensOut.inc();
                fullResponseText += token; // Collect full response
                write(res, { type: 'token', value: token }); // Structured token
            }
            write(res, { type: 'done', cites: cites }); // Pass collected cites
            res.end();
            end();
            await (0, answers_js_1.setCached)(tenant, input, fullResponseText, 60); // Cache full response
            await (0, audit_js_1.logAssistantEvent)({
                reqId,
                userId,
                mode: 'fetch',
                input,
                tokens,
                ms: Date.now() - started,
                status: ac.signal.aborted ? 'cancel' : 'ok',
            });
            // Enqueue enrichment job
            await (0, enrichment_js_1.enqueueEnrichment)({
                reqId,
                userId,
                input,
                outputPreview: 'assistant stream completed', // optional
                // investigationId: (req as any).investigationId, // Placeholder for investigationId
            });
        }
        catch (e) {
            if (!res.headersSent)
                res.status(500);
            res.end();
            httpErrors.inc();
            end();
            await (0, audit_js_1.logAssistantEvent)({
                reqId,
                userId,
                mode: 'fetch',
                input,
                tokens,
                ms: Date.now() - started,
                status: 'error',
            });
        }
    });
    // GET /assistant/sse?q=... -> text/event-stream
    app.get('/assistant/sse', (0, auth_js_1.auth)(true), (0, rateLimit_js_1.rateLimit)(), async (req, res) => {
        const started = Date.now();
        const reqId = req.reqId;
        const userId = req.user?.sub || null;
        let input = (req.query.q ?? '').toString(); // Changed to `let`
        const focusIds = req.query.focusIds || []; // Assuming focusIds in query
        if ((0, guard_js_1.isSuspicious)(input)) {
            httpErrors.inc();
            return res.status(400).json({ error: 'input_rejected' });
        }
        let experimentVariant = 'control';
        let cites = []; // Declare cites here
        if (process.env.ASSISTANT_RAG === '1') {
            // Feature flag check
            // Simple random assignment for demonstration (replace with proper tenant assignment)
            if (Math.random() < 0.1) {
                // 10% of requests go to RAG variant
                const graphContext = await (0, rag_js_1.fetchGraphContext)({
                    investigationId: reqId,
                    focusIds,
                }); // Pass reqId as investigationId
                const textPassages = await (0, rag_js_1.fetchTextPassages)(input);
                input = (0, rag_js_1.buildRagPrompt)({
                    question: input,
                    graph: graphContext,
                    passages: textPassages,
                });
                experimentVariant = 'rag_v1';
                cites = [
                    ...graphContext.map((g) => ({ kind: 'graph', ...g })),
                    ...textPassages.map((p) => ({ kind: 'doc', ...p })),
                ];
            }
        }
        logExperiment(reqId, userId, 'rag_experiment', experimentVariant); // Log experiment
        const tenant = req.user?.org ?? 'public';
        const cached = await (0, answers_js_1.getCached)(tenant, input);
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
        const end = httpLatency.startTimer();
        let tokens = 0;
        let fullResponseText = ''; // To collect full response for cache
        try {
            write(res, { type: 'status', value: 'thinking' }); // Initial status
            for await (const tok of llm.stream(input, ac.signal)) {
                tokens += 1;
                tokensOut.inc();
                fullResponseText += tok; // Collect full response
                write(res, { type: 'token', value: tok }); // Structured token
            }
            write(res, { type: 'done', cites: cites }); // Pass collected cites
            clearInterval(ping);
            res.end();
            end();
            await (0, answers_js_1.setCached)(tenant, input, fullResponseText, 60); // Cache full response
            // Store Answer node + CITED edges; bind Request + User
            const answerId = `${reqId}:${Date.now()}`;
            // Enqueue the creation of Answer node and its relationships
            (0, coalescer_js_1.enqueue)({
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
                    (0, coalescer_js_1.enqueue)({
                        type: 'cite',
                        payload: { answerId, id: c.id, kind: 'entity' },
                    });
                }
                else if (c.kind === 'doc') {
                    (0, coalescer_js_1.enqueue)({
                        type: 'cite',
                        payload: { answerId, id: c.source, kind: 'document' }, // Assuming c.source is the ID for documents
                    });
                }
            }
            (0, coalescer_js_1.enqueue)({
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
            await (0, enrichment_js_1.enqueueEnrichment)({
                reqId,
                userId,
                input,
                outputPreview: 'assistant stream completed', // optional
                // investigationId: (req as any).investigationId, // Placeholder for investigationId
            });
        }
        catch (e) {
            clearInterval(ping);
            res.end();
            httpErrors.inc();
            end();
            await (0, audit_js_1.logAssistantEvent)({
                reqId,
                userId,
                mode: 'sse',
                input,
                tokens,
                ms: Date.now() - started,
                status: 'error',
            });
        }
    });
    // Socket.IO wiring (optional; client already supports it)
    if (io) {
        io.on('connection', (socket) => {
            socket.on('assistant:ask', async ({ input, focusIds = [], }) => {
                const reqId = socket.handshake.headers['x-request-id'] || (0, node_crypto_1.randomUUID)(); // Assuming requestId middleware for HTTP, or generate for Socket.IO
                // Added focusIds
                if ((0, guard_js_1.isSuspicious)(input)) {
                    socket.emit('assistant:error', 'input_rejected');
                    return;
                }
                let experimentVariant = 'control';
                let cites = []; // Declare cites here
                // Move logic inside async block that uses reqId
                const userId = socket.handshake.auth?.token ? 'socket_user' : null; // Placeholder for actual user ID from Socket.IO auth
                if (process.env.ASSISTANT_RAG === '1') {
                    // Feature flag check
                    // Simple random assignment for demonstration (replace with proper tenant assignment)
                    if (Math.random() < 0.1) {
                        // 10% of requests go to RAG variant
                        const graphContext = await (0, rag_js_1.fetchGraphContext)({
                            investigationId: reqId,
                            focusIds,
                        }); // Pass reqId as investigationId
                        const textPassages = await (0, rag_js_1.fetchTextPassages)(input);
                        input = (0, rag_js_1.buildRagPrompt)({
                            question: input,
                            graph: graphContext,
                            passages: textPassages,
                        });
                        experimentVariant = 'rag_v1';
                        cites = [
                            ...graphContext.map((g) => ({ kind: 'graph', ...g })),
                            ...textPassages.map((p) => ({ kind: 'doc', ...p })),
                        ];
                    }
                }
                logExperiment(reqId, userId, 'rag_experiment', experimentVariant); // Log experiment
                const tenant = socket.handshake.auth?.org ?? 'public'; // Assuming org from Socket.IO auth
                const cached = await (0, answers_js_1.getCached)(tenant, input);
                if (cached) {
                    socket.emit('assistant:token', cached);
                    socket.emit('assistant:done');
                    return;
                }
                const ac = new AbortController();
                socket.on('disconnect', () => ac.abort());
                const started = Date.now();
                let tokens = 0;
                let fullResponseText = ''; // To collect full response for cache
                try {
                    socket.emit('assistant:token', {
                        type: 'status',
                        value: 'thinking',
                    }); // Initial status
                    for await (const tok of llm.stream(input, ac.signal)) {
                        tokens += 1;
                        tokensOut.inc();
                        fullResponseText += tok; // Collect full response
                        socket.emit('assistant:token', { type: 'token', value: tok }); // Structured token
                    }
                    socket.emit('assistant:done', { type: 'done', cites: cites }); // Pass collected cites
                    await (0, answers_js_1.setCached)(tenant, input, fullResponseText, 60); // Cache full response
                    // Store Answer node + CITED edges; bind Request + User
                    const answerId = `${reqId}:${Date.now()}`;
                    // Enqueue the creation of Answer node and its relationships
                    (0, coalescer_js_1.enqueue)({
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
                            (0, coalescer_js_1.enqueue)({
                                type: 'cite',
                                payload: { answerId, id: c.id, kind: 'entity' },
                            });
                        }
                        else if (c.kind === 'doc') {
                            (0, coalescer_js_1.enqueue)({
                                type: 'cite',
                                payload: { answerId, id: c.id, kind: 'document' }, // Assuming c.id is the ID for documents
                            });
                        }
                    }
                    (0, coalescer_js_1.enqueue)({
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
                    await (0, enrichment_js_1.enqueueEnrichment)({
                        reqId,
                        userId,
                        input,
                        outputPreview: 'assistant stream completed', // optional
                        // investigationId: (req as any).investigationId, // Placeholder for investigationId
                    });
                }
                catch (e) {
                    socket.emit('assistant:error', 'stream_failed');
                    await (0, audit_js_1.logAssistantEvent)({
                        reqId,
                        userId,
                        mode: 'socket',
                        input,
                        tokens,
                        ms: Date.now() - started,
                        status: 'error',
                    });
                }
            });
        });
    }
}
