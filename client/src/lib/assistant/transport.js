"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFetchStreamTransport = createFetchStreamTransport;
exports.createSseTransport = createSseTransport;
exports.createSocketIoTransport = createSocketIoTransport;
function expBackoff(attempt, { baseMs = 300, maxMs = 5000, factor = 2, jitter = true } = {}) {
    const raw = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
    return jitter ? Math.round(raw * (0.7 + Math.random() * 0.6)) : raw;
}
function withAuthHeaders(getAuthToken) {
    const token = getAuthToken?.();
    const headers = { 'Content-Type': 'application/json' };
    if (token)
        headers.Authorization = `Bearer ${token}`;
    return headers;
}
// ---- Fetch streaming (HTTP) ----
function createFetchStreamTransport(opts) {
    let handler = null;
    return {
        on: (fn) => {
            handler = fn;
            return () => {
                handler = null;
            };
        },
        send: async (input, signal) => {
            try {
                // Emit a local thinking status so UIs/tests get immediate feedback
                handler?.({ type: 'status', value: 'thinking' });
                const res = await fetch(`${opts.baseUrl}/assistant/stream`, {
                    method: 'POST',
                    headers: withAuthHeaders(opts.getAuthToken),
                    body: JSON.stringify({ input }),
                    signal,
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                // Support both streaming body and text() fallback
                if (res.body && 'getReader' in res.body) {
                    const reader = res.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done)
                            break;
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer
                        lines.forEach((line) => {
                            if (line) {
                                try {
                                    const event = JSON.parse(line);
                                    handler?.(event);
                                }
                                catch (e) {
                                    // Fallback: treat line as a plain token
                                    handler?.({ type: 'token', value: line });
                                }
                            }
                        });
                    }
                    // Process any remaining data in the buffer after stream ends
                    if (buffer) {
                        try {
                            const event = JSON.parse(buffer);
                            handler?.(event);
                        }
                        catch (e) {
                            handler?.({ type: 'token', value: buffer });
                        }
                    }
                    // Signal completion for consumers that expect an explicit done
                    handler?.({ type: 'done' });
                }
                else {
                    const text = await res.text();
                    // Assuming fallback text is a single token or error
                    try {
                        const event = JSON.parse(text); // Try to parse as NDJSON event
                        handler?.(event);
                    }
                    catch (e) {
                        handler?.({ type: 'token', value: text }); // Fallback to plain text token
                    }
                }
                // Ensure done even for non-streaming paths
                handler?.({ type: 'done' });
            }
            catch (e) {
                if (signal?.aborted)
                    return;
                handler?.({ type: 'error', error: e });
            }
        },
    };
}
// ---- SSE (EventSource) ----
// Note: Authorization header isn’t supported by native EventSource; use a token query param or cookie.
function createSseTransport(opts) {
    let handler = null;
    let es = null;
    let attempt = 0;
    const open = (input, signal) => {
        const token = opts.getAuthToken?.();
        const url = new URL(`${opts.baseUrl}/assistant/sse`, window.location.origin);
        url.searchParams.set('q', input);
        if (token)
            url.searchParams.set('token', token);
        es = new EventSource(url.toString(), { withCredentials: !!token });
        // handler?.({ type: "status", value: "thinking" }); // Server will send this
        const onMessage = (ev) => {
            const data = (ev.data ?? '').toString();
            if (data) {
                // Process only if data is not empty
                try {
                    const event = JSON.parse(data);
                    handler?.(event);
                }
                catch (e) {
                    console.error('Failed to parse SSE data:', data, e);
                }
            }
        };
        const onError = () => {
            if (signal.aborted)
                return;
            es?.close();
            es = null;
            attempt += 1;
            const delay = expBackoff(attempt, opts.backoff);
            setTimeout(() => open(input, signal), delay);
        };
        es.addEventListener('message', onMessage);
        es.addEventListener('error', onError);
        signal.addEventListener('abort', () => {
            es?.close();
            es = null;
        });
    };
    return {
        on: (fn) => {
            handler = fn;
            return () => {
                handler = null;
            };
        },
        send: (input, signal) => open(input, signal),
    };
}
// ---- Socket.IO ----
function createSocketIoTransport(opts) {
    // Lazy-import so tests can mock without bundling the client in non-RT paths
    let SocketIO;
    try {
        SocketIO = require('socket.io-client');
    }
    catch (_) { }
    let handler = null;
    let socket = null;
    let attempt = 0;
    const connect = () => {
        if (!SocketIO)
            throw new Error('socket.io-client not available');
        const token = opts.getAuthToken?.();
        socket = SocketIO.io(opts.baseUrl, {
            auth: token ? { token } : undefined,
            transports: ['websocket'],
            reconnectionAttempts: 0, // we handle backoff manually per request
        });
    };
    return {
        on: (fn) => {
            handler = fn;
            return () => {
                handler = null;
            };
        },
        send: (input, signal) => {
            const run = () => {
                // handler?.({ type: "status", value: "thinking" }); // Server will send this
                socket.emit('assistant:ask', { input });
            };
            if (!socket) {
                connect();
                socket.on('connect', run);
                socket.on('assistant:token', (event) => handler?.(event)); // Expecting structured event
                socket.on('assistant:done', (event) => {
                    handler?.(event);
                    attempt = 0;
                }); // Expecting structured event
                socket.on('connect_error', () => {
                    if (signal.aborted)
                        return;
                    attempt += 1;
                    const delay = expBackoff(attempt, opts.backoff);
                    setTimeout(() => {
                        try {
                            socket?.disconnect();
                        }
                        catch { }
                        socket = null;
                    }, 0);
                    setTimeout(() => {
                        if (!signal.aborted)
                            run();
                    }, delay);
                });
                signal.addEventListener('abort', () => {
                    try {
                        socket?.disconnect();
                    }
                    catch { }
                    socket = null;
                });
            }
            else {
                run();
            }
        },
    };
}
