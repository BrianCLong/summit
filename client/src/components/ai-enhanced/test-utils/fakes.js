"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeFakeClock = makeFakeClock;
exports.makeFakeTransport = makeFakeTransport;
exports.makeStreamingTransport = makeStreamingTransport;
function makeFakeClock() {
    const real = {
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (id) => clearTimeout(id),
        now: () => Date.now(),
    };
    return real;
}
function makeFakeTransport(script, opts = {}) {
    const { mode = 'microtask', spacingMs = 1, ensureLeadingStatus = true, } = opts;
    const seq = ensureLeadingStatus && script[0]?.type !== 'status'
        ? [{ type: 'status', value: 'thinking' }, ...script]
        : script;
    let handler = null;
    const scheduleMicro = (fn) => Promise.resolve().then(fn);
    const scheduleTimer = (fn, delay) => setTimeout(fn, delay);
    return {
        on: (fn) => {
            console.warn('FAKE TRANSPORT: on called');
            handler = fn;
            return () => {
                console.warn('FAKE TRANSPORT: unsubscribe called');
                handler = null;
            };
        },
        send: (_input, signal) => {
            let cancelled = false;
            const onAbort = () => {
                cancelled = true;
            };
            signal?.addEventListener('abort', onAbort);
            seq.forEach((evt, idx) => {
                const run = () => {
                    console.warn('FAKE TRANSPORT: running event', evt.type, evt.type === 'token' ? evt.value : '');
                    if (!cancelled && handler) {
                        handler(evt);
                    }
                    else {
                        console.warn('FAKE TRANSPORT: skipped (cancelled:', cancelled, 'handler:', !!handler, ')');
                    }
                };
                if (mode === 'timer') {
                    const id = scheduleTimer(run, idx * spacingMs);
                    signal?.addEventListener('abort', () => clearTimeout(id));
                }
                else {
                    scheduleMicro(run);
                }
            });
        },
    };
}
function makeStreamingTransport(tokens, opts = {}) {
    const events = [
        ...tokens.map((token) => ({ type: 'token', value: token })),
        { type: 'done' },
    ];
    return makeFakeTransport(events, opts);
}
