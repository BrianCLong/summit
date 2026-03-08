"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const transport_1 = require("./transport");
function collect(transport, sendText = 'hi') {
    const events = [];
    const unsub = transport.on((e) => events.push(e));
    const ctrl = new AbortController();
    transport.send(sendText, ctrl.signal);
    return new Promise((resolve) => setTimeout(() => {
        unsub();
        resolve(events);
    }, 0));
}
test('fetch transport streams tokens then done', async () => {
    const encoder = new TextEncoder();
    // Mock streaming fetch
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: {
            getReader() {
                let i = 0;
                const chunks = ['I ', 'understand ', 'your ', 'query\n'];
                return {
                    read: () => Promise.resolve(i < chunks.length
                        ? { value: encoder.encode(chunks[i++]), done: false }
                        : { value: undefined, done: true }),
                    releaseLock() { },
                };
            },
        },
    });
    const t = (0, transport_1.createFetchStreamTransport)({
        baseUrl: '/api',
        getAuthToken: () => 't',
    });
    const events = await collect(t);
    expect(events[0]).toEqual({ type: 'status', value: 'thinking' });
    expect(events
        .filter((e) => e.type === 'token')
        .map((e) => e.value)
        .join('')).toMatch(/I understand your query/);
    expect(events[events.length - 1]).toEqual({ type: 'done' });
});
